import { getDb } from './db';

export type LabEquipmentStatus = 'idle' | 'busy' | 'maintenance';
export type SqlExecutor = any;

export interface LabEquipmentRecord {
  id: string;
  equipmentName: string;
  status: LabEquipmentStatus;
  createdAt: string;
  updatedAt: string;
}

let ensured = false;

function mapEquipment(record: any): LabEquipmentRecord {
  return {
    id: record.id,
    equipmentName: record.equipment_name,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function ensureLabEquipmentTable(sql: SqlExecutor = getDb()): Promise<void> {
  if (ensured) return;

  await sql`
    CREATE TABLE IF NOT EXISTS lab_equipment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      equipment_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const [result] = await sql`
    SELECT COUNT(*)::int AS count
    FROM lab_equipment
  `;

  if ((result?.count ?? 0) === 0) {
    await sql`
      INSERT INTO lab_equipment (equipment_name, status)
      VALUES
        ('全自动压力试验机 01', 'idle'),
        ('全自动压力试验机 02', 'busy'),
        ('全自动压力试验机 03', 'maintenance')
    `;
  }

  ensured = true;
}

export async function listLabEquipment(status?: LabEquipmentStatus): Promise<LabEquipmentRecord[]> {
  const sql = getDb();
  await ensureLabEquipmentTable(sql);
  const records = status
    ? await sql`
        SELECT *
        FROM lab_equipment
        WHERE status = ${status}
        ORDER BY equipment_name ASC
      `
    : await sql`
        SELECT *
        FROM lab_equipment
        ORDER BY equipment_name ASC
      `;

  return records.map(mapEquipment);
}

export async function getLabEquipmentById(
  id: string,
  sql: SqlExecutor = getDb()
): Promise<LabEquipmentRecord | null> {
  await ensureLabEquipmentTable(sql);
  const [record] = await sql`
    SELECT *
    FROM lab_equipment
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  return record ? mapEquipment(record) : null;
}

export async function updateLabEquipmentStatus(
  id: string,
  status: LabEquipmentStatus,
  sql: SqlExecutor = getDb()
): Promise<LabEquipmentRecord | null> {
  await ensureLabEquipmentTable(sql);
  const [record] = await sql`
    UPDATE lab_equipment
    SET
      status = ${status},
      updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING *
  `;
  return record ? mapEquipment(record) : null;
}
