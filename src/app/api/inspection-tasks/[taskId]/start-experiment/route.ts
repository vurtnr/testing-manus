import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { buildInspectionTask } from '@/lib/entrust';
import {
  getEntrustOrderById,
  updateEntrustTaskAssignment,
} from '@/lib/entrust-store';
import {
  getLabEquipmentById,
  updateLabEquipmentStatus,
} from '@/lib/lab-equipment-store';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const { taskId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const equipmentId = typeof body?.equipmentId === 'string' ? body.equipmentId : '';
    const sql = getDb();

    if (!equipmentId) {
      return NextResponse.json({ error: '缺少设备 ID' }, { status: 400 });
    }

    const result = await sql.begin(async (tx) => {
      const task = await getEntrustOrderById(user.id, taskId, tx);
      if (!task) {
        throw new Error('TASK_NOT_FOUND');
      }
      if (task.taskStatus !== 'pending_claim') {
        throw new Error('TASK_STATUS_INVALID');
      }

      const equipment = await getLabEquipmentById(equipmentId, tx);
      if (!equipment) {
        throw new Error('EQUIPMENT_NOT_FOUND');
      }
      if (equipment.status !== 'idle') {
        throw new Error('EQUIPMENT_NOT_IDLE');
      }

      const updatedEquipment = await updateLabEquipmentStatus(equipmentId, 'busy', tx);
      const updatedTask = await updateEntrustTaskAssignment(
        user.id,
        taskId,
        'in_experiment',
        '实验人员A',
        {
          assignedEquipmentId: equipment.id,
          assignedEquipmentName: equipment.equipmentName,
        },
        tx
      );

      if (!updatedEquipment || !updatedTask) {
        throw new Error('TASK_UPDATE_FAILED');
      }

      return { updatedEquipment, updatedTask };
    });

    return NextResponse.json({
      task: buildInspectionTask(result.updatedTask),
      equipment: {
        id: result.updatedEquipment.id,
        equipmentName: result.updatedEquipment.equipmentName,
        status: result.updatedEquipment.status,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const statusMap: Record<string, number> = {
      TASK_NOT_FOUND: 404,
      TASK_STATUS_INVALID: 409,
      EQUIPMENT_NOT_FOUND: 404,
      EQUIPMENT_NOT_IDLE: 409,
      TASK_UPDATE_FAILED: 500,
    };
    const messageMap: Record<string, string> = {
      TASK_NOT_FOUND: '任务不存在',
      TASK_STATUS_INVALID: '当前任务不是待领取状态',
      EQUIPMENT_NOT_FOUND: '设备不存在',
      EQUIPMENT_NOT_IDLE: '当前设备不可领取',
      TASK_UPDATE_FAILED: '任务状态更新失败',
    };

    return NextResponse.json(
      { error: messageMap[error.message] ?? error.message },
      { status: statusMap[error.message] ?? 500 }
    );
  }
}
