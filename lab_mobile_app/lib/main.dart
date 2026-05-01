import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const LabMobileApp());
}

typedef TaskApiFactory = TaskApi Function(String baseUrl);

abstract class TaskApi {
  Future<List<InspectionTask>> fetchInspectionTasks();
  Future<InspectionTask> fetchTaskByOrderNo(String orderNo);
  Future<List<LabEquipment>> fetchIdleEquipment();
  Future<StartExperimentResult> startExperiment({
    required String taskId,
    required String equipmentId,
  });
  Future<InspectionTask> completeExperiment({required String taskId});
}

class LabMobileApp extends StatelessWidget {
  const LabMobileApp({super.key, TaskApiFactory? apiFactory})
    : _apiFactory = apiFactory ?? ApiClient.new;

  final TaskApiFactory _apiFactory;

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3030',
  );

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '检测实验 App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F766E),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF3F8F7),
        cardTheme: const CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(20)),
          ),
        ),
      ),
      home: HomePage(api: _apiFactory(baseUrl)),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.api});

  final TaskApi api;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _loading = true;
  String? _error;
  String? _feedback;
  String? _completingTaskId;
  List<InspectionTask> _tasks = const [];

  List<InspectionTask> get _activeTasks =>
      _tasks.where((task) => task.taskStatus == 'in_experiment').toList();

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final tasks = await widget.api.fetchInspectionTasks();
      if (!mounted) return;
      setState(() => _tasks = tasks);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _openTaskLookup() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TaskLookupPage(api: widget.api),
      ),
    );

    if (mounted) {
      await _loadTasks();
    }
  }

  Future<void> _handleComplete(InspectionTask task) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认实验已完成？'),
        content: Text('完成后，${task.orderNo} 会从首页移除，并释放当前设备。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('确认完成'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _completingTaskId = task.id;
      _feedback = null;
      _error = null;
    });

    try {
      await widget.api.completeExperiment(taskId: task.id);
      if (!mounted) return;
      setState(() {
        _tasks = _tasks.where((item) => item.id != task.id).toList();
        _feedback = '已将 ${task.orderNo} 标记为实验完成';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _completingTaskId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadTasks,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const SizedBox(height: 8),
              Text(
                '我的实验任务',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF16302B),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF50645D),
                ),
              ),
              const SizedBox(height: 24),
              _InfoCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _TaskCountChip(count: _activeTasks.length),
                    const SizedBox(height: 14),
                    const _SectionTitle('任务查看'),
                    const SizedBox(height: 8),
                    const Text(
                      '默认只展示实验中的任务，完成后会从首页主列表移除。',
                      style: TextStyle(
                        color: Color(0xFF50645D),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _loading ? null : _loadTasks,
                            child: const Text('刷新列表'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: FilledButton(
                            onPressed: _openTaskLookup,
                            child: const Text('去领取任务'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (_feedback != null) ...[
                const SizedBox(height: 16),
                _FeedbackBanner(
                  text: _feedback!,
                  backgroundColor: const Color(0xFFE8F7F3),
                  textColor: const Color(0xFF0F766E),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 16),
                _FeedbackBanner(
                  text: _error!,
                  backgroundColor: const Color(0xFFFDECEA),
                  textColor: const Color(0xFFB42318),
                ),
              ],
              const SizedBox(height: 20),
              if (_loading)
                const Center(child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: CircularProgressIndicator(),
                ))
              else if (_activeTasks.isEmpty)
                const _EmptyStateCard()
              else
                ..._activeTasks.map(
                  (task) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _TaskCard(
                      task: task,
                      busy: _completingTaskId == task.id,
                      onComplete: () => _handleComplete(task),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class TaskLookupPage extends StatefulWidget {
  const TaskLookupPage({super.key, required this.api});

  final TaskApi api;

  @override
  State<TaskLookupPage> createState() => _TaskLookupPageState();
}

class _TaskLookupPageState extends State<TaskLookupPage> {
  bool _loading = false;
  String? _openingTaskId;
  String? _error;
  List<InspectionTask> _tasks = const [];

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  List<InspectionTask> get _pendingTasks =>
      _tasks.where((task) => task.taskStatus == 'pending_claim').toList();

  Future<void> _loadTasks() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final tasks = await widget.api.fetchInspectionTasks();
      if (!mounted) return;
      setState(() => _tasks = tasks);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _handleSelectTask(InspectionTask task) async {
    setState(() {
      _openingTaskId = task.id;
      _error = null;
    });

    try {
      final equipment = await widget.api.fetchIdleEquipment();
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => TaskDetailPage(
            api: widget.api,
            task: task,
            equipment: equipment,
          ),
        ),
      );
      if (mounted) {
        await _loadTasks();
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _openingTaskId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('实验任务领取')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadTasks,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const SizedBox(height: 8),
              Text(
                '实验任务领取',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF16302B),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '直接选择待领取任务，查看样品信息后进入设备分配。无需手工输入任务编号。',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF50645D),
                ),
              ),
              const SizedBox(height: 24),
              _InfoCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _TaskCountChip(count: _pendingTasks.length, label: '待领取'),
                    const SizedBox(height: 14),
                    const _SectionTitle('选择任务'),
                    const SizedBox(height: 8),
                    const Text(
                      '只展示待领取状态的任务。点击任意任务后，继续选择空闲设备并开始实验。',
                      style: TextStyle(
                        color: Color(0xFF50645D),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _loading ? null : _loadTasks,
                        child: const Text('刷新待领取任务'),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: Color(0xFFB42318),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (_loading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 48),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_pendingTasks.isEmpty)
                const _PendingClaimEmptyStateCard()
              else
                ..._pendingTasks.map(
                  (task) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _PendingClaimTaskCard(
                      task: task,
                      busy: _openingTaskId == task.id,
                      onSelect: () => _handleSelectTask(task),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class TaskDetailPage extends StatefulWidget {
  const TaskDetailPage({
    super.key,
    required this.api,
    required this.task,
    required this.equipment,
  });

  final TaskApi api;
  final InspectionTask task;
  final List<LabEquipment> equipment;

  @override
  State<TaskDetailPage> createState() => _TaskDetailPageState();
}

class _TaskDetailPageState extends State<TaskDetailPage> {
  String? _selectedEquipmentId;
  bool _submitting = false;
  String? _error;

  Future<void> _handleStartExperiment() async {
    if (_selectedEquipmentId == null) {
      setState(() => _error = '请先选择一台空闲设备');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final result = await widget.api.startExperiment(
        taskId: widget.task.id,
        equipmentId: _selectedEquipmentId!,
      );
      if (!mounted) return;
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => SuccessPage(
            task: result.task,
            equipment: result.equipment,
          ),
        ),
      );
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;

    return Scaffold(
      appBar: AppBar(title: const Text('任务详情')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: ListView(
            children: [
              _InfoCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionTitle(task.orderNo),
                    const SizedBox(height: 14),
                    _LabelValue('样品名称', task.sampleName),
                    _LabelValue('数量', '${task.sampleCount}'),
                    _LabelValue('检测参数', task.testItems),
                    _LabelValue('检测标准', task.testStandard.isEmpty ? '待补充' : task.testStandard),
                    _LabelValue('任务状态', task.taskStatus == 'pending_claim' ? '待领取' : '实验中'),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              _InfoCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionTitle('选择空闲设备'),
                    const SizedBox(height: 14),
                    if (widget.equipment.isEmpty)
                      const Text('当前没有空闲设备可领取。')
                    else
                      ...widget.equipment.map((item) {
                        final selected = item.id == _selectedEquipmentId;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => setState(() => _selectedEquipmentId = item.id),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: selected
                                      ? const Color(0xFF0F766E)
                                      : const Color(0xFFD7E5E1),
                                  width: selected ? 2 : 1,
                                ),
                                color: selected
                                    ? const Color(0xFFEAF8F4)
                                    : Colors.white,
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      item.equipmentName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF16302B),
                                      ),
                                    ),
                                  ),
                                  const Text(
                                    '空闲',
                                    style: TextStyle(
                                      color: Color(0xFF0F766E),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _submitting ? null : _handleStartExperiment,
                        child: Text(_submitting ? '提交中…' : '开始实验'),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: Color(0xFFB42318),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SuccessPage extends StatelessWidget {
  const SuccessPage({
    super.key,
    required this.task,
    required this.equipment,
  });

  final InspectionTask task;
  final LabEquipment equipment;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('领取成功')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _InfoCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle, color: Color(0xFF0F766E), size: 44),
                    const SizedBox(height: 16),
                    Text(
                      '任务已开始实验',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF16302B),
                      ),
                    ),
                    const SizedBox(height: 14),
                    _LabelValue('任务单号', task.orderNo),
                    _LabelValue('任务状态', '实验中'),
                    _LabelValue('实验人员', task.experimenterName.isEmpty ? '实验人员A' : task.experimenterName),
                    _LabelValue('实验设备', equipment.equipmentName),
                  ],
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    Navigator.of(context).popUntil((route) => route.isFirst);
                  },
                  child: const Text('返回首页'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ApiClient implements TaskApi {
  ApiClient(this.baseUrl);

  final String baseUrl;

  Uri _uri(String path, [Map<String, String>? query]) {
    return Uri.parse('$baseUrl$path').replace(queryParameters: query);
  }

  @override
  Future<List<InspectionTask>> fetchInspectionTasks() async {
    final response = await http.get(
      _uri('/api/inspection-tasks'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_extractErrorMessage(response.body, '加载任务列表失败'));
    }

    final body = jsonDecode(response.body) as List<dynamic>;
    return body
        .map((item) => InspectionTask.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<InspectionTask> fetchTaskByOrderNo(String orderNo) async {
    final response = await http.get(
      _uri('/api/inspection-tasks/by-order-no', {'orderNo': orderNo}),
      headers: {'Content-Type': 'application/json'},
    );
    return _handleTaskResponse(response);
  }

  @override
  Future<List<LabEquipment>> fetchIdleEquipment() async {
    final response = await http.get(
      _uri('/api/lab-equipment', {'status': 'idle'}),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_extractErrorMessage(response.body, '加载设备列表失败'));
    }
    final body = jsonDecode(response.body) as List<dynamic>;
    return body
        .map((item) => LabEquipment.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<StartExperimentResult> startExperiment({
    required String taskId,
    required String equipmentId,
  }) async {
    final response = await http.post(
      _uri('/api/inspection-tasks/$taskId/start-experiment'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'equipmentId': equipmentId}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_extractErrorMessage(response.body, '开始实验失败'));
    }

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return StartExperimentResult(
      task: InspectionTask.fromJson(body['task'] as Map<String, dynamic>),
      equipment: LabEquipment.fromJson(body['equipment'] as Map<String, dynamic>),
    );
  }

  @override
  Future<InspectionTask> completeExperiment({required String taskId}) async {
    final response = await http.post(
      _uri('/api/inspection-tasks/$taskId/complete-experiment'),
      headers: {'Content-Type': 'application/json'},
    );
    return _handleTaskResponse(response, fallback: '完成实验失败');
  }

  InspectionTask _handleTaskResponse(
    http.Response response, {
    String fallback = '加载任务失败',
  }) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_extractErrorMessage(response.body, fallback));
    }
    return InspectionTask.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  String _extractErrorMessage(String body, String fallback) {
    try {
      final decoded = jsonDecode(body) as Map<String, dynamic>;
      return decoded['error'] as String? ?? fallback;
    } catch (_) {
      return fallback;
    }
  }
}

class InspectionTask {
  InspectionTask({
    required this.id,
    required this.orderNo,
    required this.sampleName,
    required this.sampleCount,
    required this.testItems,
    required this.testStandard,
    required this.taskStatus,
    required this.experimenterName,
    required this.assignedEquipmentId,
    required this.assignedEquipmentName,
  });

  factory InspectionTask.fromJson(Map<String, dynamic> json) {
    return InspectionTask(
      id: json['id'] as String,
      orderNo: json['orderNo'] as String,
      sampleName: json['sampleName'] as String? ?? '',
      sampleCount: json['sampleCount'] as int? ?? 0,
      testItems: json['testItems'] as String? ?? '',
      testStandard: json['testStandard'] as String? ?? '',
      taskStatus: json['taskStatus'] as String? ?? 'pending_claim',
      experimenterName: json['experimenterName'] as String? ?? '',
      assignedEquipmentId: json['assignedEquipmentId'] as String? ?? '',
      assignedEquipmentName: json['assignedEquipmentName'] as String? ?? '',
    );
  }

  final String id;
  final String orderNo;
  final String sampleName;
  final int sampleCount;
  final String testItems;
  final String testStandard;
  final String taskStatus;
  final String experimenterName;
  final String assignedEquipmentId;
  final String assignedEquipmentName;
}

class LabEquipment {
  LabEquipment({
    required this.id,
    required this.equipmentName,
    required this.status,
  });

  factory LabEquipment.fromJson(Map<String, dynamic> json) {
    return LabEquipment(
      id: json['id'] as String,
      equipmentName: json['equipmentName'] as String? ?? '',
      status: json['status'] as String? ?? '',
    );
  }

  final String id;
  final String equipmentName;
  final String status;
}

class StartExperimentResult {
  StartExperimentResult({
    required this.task,
    required this.equipment,
  });

  final InspectionTask task;
  final LabEquipment equipment;
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: child,
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w800,
        color: const Color(0xFF16302B),
      ),
    );
  }
}

class _LabelValue extends StatelessWidget {
  const _LabelValue(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF5C716A),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: Color(0xFF16302B),
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskCountChip extends StatelessWidget {
  const _TaskCountChip({required this.count, this.label = '实验中'});

  final int count;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF8F4),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label $count 项',
        style: const TextStyle(
          color: Color(0xFF0F766E),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _FeedbackBanner extends StatelessWidget {
  const _FeedbackBanner({
    required this.text,
    required this.backgroundColor,
    required this.textColor,
  });

  final String text;
  final Color backgroundColor;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _EmptyStateCard extends StatelessWidget {
  const _EmptyStateCard();

  @override
  Widget build(BuildContext context) {
    return _InfoCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle('当前没有进行中的实验任务'),
          const SizedBox(height: 10),
          Text(
            '你可以先去领取任务。任务开始后，会自动回到首页等待你完成收口。',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF50645D),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _PendingClaimEmptyStateCard extends StatelessWidget {
  const _PendingClaimEmptyStateCard();

  @override
  Widget build(BuildContext context) {
    return _InfoCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle('当前没有待领取任务'),
          const SizedBox(height: 10),
          Text(
            '所有任务都已领取，或者后台暂时还没有分配新的实验任务。下拉或点击刷新后可再次查看。',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF50645D),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({
    required this.task,
    required this.busy,
    required this.onComplete,
  });

  final InspectionTask task;
  final bool busy;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    return _InfoCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  '${task.orderNo} · ${task.sampleName}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF16302B),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF8F4),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  '实验中',
                  style: TextStyle(
                    color: Color(0xFF0F766E),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _LabelValue('检测项目', task.testItems),
          _LabelValue('检测标准', task.testStandard.isEmpty ? '待补充' : task.testStandard),
          _LabelValue('实验设备', task.assignedEquipmentName.isEmpty ? '待补录' : task.assignedEquipmentName),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: busy ? null : onComplete,
              child: Text(busy ? '提交中…' : '实验完成'),
            ),
          ),
        ],
      ),
    );
  }
}

class _PendingClaimTaskCard extends StatelessWidget {
  const _PendingClaimTaskCard({
    required this.task,
    required this.busy,
    required this.onSelect,
  });

  final InspectionTask task;
  final bool busy;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return _InfoCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  '${task.orderNo} · ${task.sampleName}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF16302B),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF8F4),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  '待领取',
                  style: TextStyle(
                    color: Color(0xFF0F766E),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _LabelValue('样品数量', '${task.sampleCount}'),
          _LabelValue('检测项目', task.testItems),
          _LabelValue('检测标准', task.testStandard.isEmpty ? '待补充' : task.testStandard),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: busy ? null : onSelect,
              child: Text(busy ? '加载中…' : '选择此任务'),
            ),
          ),
        ],
      ),
    );
  }
}
