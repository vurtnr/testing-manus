import 'package:flutter_test/flutter_test.dart';

import 'package:lab_mobile_app/main.dart';

class FakeTaskApi implements TaskApi {
  @override
  Future<List<InspectionTask>> fetchInspectionTasks() async => [
    InspectionTask(
      id: 'task-1',
      orderNo: 'WT-20260420-001',
      sampleName: '混凝土试块',
      sampleCount: 1,
      testItems: '抗压',
      testStandard: 'GB/T 50081-2019',
      taskStatus: 'in_experiment',
      experimenterName: '实验员A',
      assignedEquipmentId: 'equipment-1',
      assignedEquipmentName: '全自动压力试验机 01',
    ),
  ];

  @override
  Future<InspectionTask> fetchTaskByOrderNo(String orderNo) {
    throw UnimplementedError();
  }

  @override
  Future<List<LabEquipment>> fetchIdleEquipment() {
    throw UnimplementedError();
  }

  @override
  Future<StartExperimentResult> startExperiment({
    required String taskId,
    required String equipmentId,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<InspectionTask> completeExperiment({required String taskId}) async {
    return (await fetchInspectionTasks()).first;
  }
}

void main() {
  testWidgets('renders home hub with active task and claim entry', (WidgetTester tester) async {
    await tester.pumpWidget(LabMobileApp(apiFactory: (_) => FakeTaskApi()));
    await tester.pumpAndSettle();

    expect(find.text('我的实验任务'), findsOneWidget);
    expect(find.textContaining('WT-20260420-001'), findsOneWidget);
    expect(find.text('实验完成'), findsOneWidget);
    expect(find.text('去领取任务'), findsOneWidget);
  });
}
