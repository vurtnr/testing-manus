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
    const sql = getDb();

    const updatedTask = await sql.begin(async (tx) => {
      const task = await getEntrustOrderById(user.id, taskId, tx);
      if (!task) {
        throw new Error('TASK_NOT_FOUND');
      }
      if (task.taskStatus !== 'in_experiment') {
        throw new Error('TASK_STATUS_INVALID');
      }
      if (!task.assignedEquipmentId) {
        throw new Error('TASK_EQUIPMENT_MISSING');
      }

      const equipment = await getLabEquipmentById(task.assignedEquipmentId, tx);
      if (!equipment) {
        throw new Error('EQUIPMENT_NOT_FOUND');
      }

      const updatedEquipment = await updateLabEquipmentStatus(equipment.id, 'idle', tx);
      const updated = await updateEntrustTaskAssignment(
        user.id,
        taskId,
        'awaiting_raw_data',
        task.experimenterName,
        {
          assignedEquipmentId: task.assignedEquipmentId,
          assignedEquipmentName: task.assignedEquipmentName,
        },
        tx
      );

      if (!updatedEquipment || !updated) {
        throw new Error('TASK_UPDATE_FAILED');
      }

      return updated;
    });

    return NextResponse.json(buildInspectionTask(updatedTask));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statusMap: Record<string, number> = {
      TASK_NOT_FOUND: 404,
      TASK_STATUS_INVALID: 409,
      TASK_EQUIPMENT_MISSING: 409,
      EQUIPMENT_NOT_FOUND: 404,
      TASK_UPDATE_FAILED: 500,
    };
    const messageMap: Record<string, string> = {
      TASK_NOT_FOUND: '任务不存在',
      TASK_STATUS_INVALID: '当前任务不是实验中状态',
      TASK_EQUIPMENT_MISSING: '当前任务缺少已分配设备',
      EQUIPMENT_NOT_FOUND: '设备不存在',
      TASK_UPDATE_FAILED: '任务完成失败',
    };

    return NextResponse.json(
      { error: messageMap[error.message] ?? error.message },
      { status: statusMap[error.message] ?? 500 }
    );
  }
}
