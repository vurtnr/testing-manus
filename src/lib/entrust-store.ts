import { getDb } from './db';
import {
  normalizeInspectionTaskStatus,
  type EntrustFormData,
  type EntrustOrderRecord,
} from './entrust';

let ensured = false;

// postgres.js transaction typings drop the tagged-template call signature,
// so keep this escape hatch local to the store helpers that accept either root
// sql or transaction sql executors.
export type SqlExecutor = any;

export async function ensureEntrustOrdersTable(sql: SqlExecutor = getDb()): Promise<void> {
  if (ensured) return;

  await sql`
    CREATE TABLE IF NOT EXISTS entrust_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      order_no TEXT NOT NULL UNIQUE,
      paper_entrust_no TEXT,
      contract_no TEXT NOT NULL,
      client_name TEXT NOT NULL,
      construction_unit TEXT,
      supervision_unit TEXT,
      contractor_unit TEXT,
      project_name TEXT NOT NULL,
      project_location TEXT,
      witness_name TEXT,
      witness_phone TEXT,
      sampler_name TEXT,
      sampler_phone TEXT,
      sample_name TEXT NOT NULL,
      sample_count INTEGER NOT NULL DEFAULT 1,
      sample_spec TEXT NOT NULL,
      sample_batch TEXT,
      engineering_part TEXT,
      manufacturer TEXT,
      representative_quantity TEXT,
      production_date TEXT,
      test_items TEXT NOT NULL,
      test_standard TEXT,
      sample_code TEXT,
      contact_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      received_at TIMESTAMPTZ NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending_acceptance',
      task_status TEXT NOT NULL DEFAULT 'pending_claim',
      experimenter_name TEXT,
      assigned_equipment_id UUID,
      assigned_equipment_name TEXT,
      pickup_department TEXT,
      raw_data_image_path TEXT,
      raw_data_image_name TEXT,
      raw_data_preview_json JSONB,
      ai_review_trace_json JSONB,
      ai_review_summary TEXT,
      ai_review_passed BOOLEAN NOT NULL DEFAULT false,
      review_comment TEXT,
      reviewed_at TIMESTAMPTZ,
      issued_document_name TEXT,
      issued_document_url TEXT,
      ocr_source_name TEXT NOT NULL,
      source_image_name TEXT,
      source_image_path TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const optionalColumns = [
    ['paper_entrust_no', 'TEXT'],
    ['construction_unit', 'TEXT'],
    ['supervision_unit', 'TEXT'],
    ['contractor_unit', 'TEXT'],
    ['project_location', 'TEXT'],
    ['witness_name', 'TEXT'],
    ['witness_phone', 'TEXT'],
    ['sampler_name', 'TEXT'],
    ['sampler_phone', 'TEXT'],
    ['sample_count', 'INTEGER NOT NULL DEFAULT 1'],
    ['sample_batch', 'TEXT'],
    ['engineering_part', 'TEXT'],
    ['manufacturer', 'TEXT'],
    ['representative_quantity', 'TEXT'],
    ['production_date', 'TEXT'],
    ['test_standard', 'TEXT'],
    ['sample_code', 'TEXT'],
    ['note', 'TEXT'],
    ['task_status', "TEXT NOT NULL DEFAULT 'pending_claim'"],
    ['experimenter_name', 'TEXT'],
    ['assigned_equipment_id', 'UUID'],
    ['assigned_equipment_name', 'TEXT'],
    ['pickup_department', 'TEXT'],
    ['raw_data_image_path', 'TEXT'],
    ['raw_data_image_name', 'TEXT'],
    ['raw_data_preview_json', 'JSONB'],
    ['ai_review_trace_json', 'JSONB'],
    ['ai_review_summary', 'TEXT'],
    ['ai_review_passed', 'BOOLEAN NOT NULL DEFAULT false'],
    ['review_comment', 'TEXT'],
    ['reviewed_at', 'TIMESTAMPTZ'],
    ['issued_document_name', 'TEXT'],
    ['issued_document_url', 'TEXT'],
    ['source_image_name', 'TEXT'],
    ['source_image_path', 'TEXT'],
  ] as const;

  for (const [columnName, columnType] of optionalColumns) {
    await sql.unsafe(`ALTER TABLE entrust_orders ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`);
  }

  await sql`
    CREATE INDEX IF NOT EXISTS idx_entrust_orders_user_created
    ON entrust_orders (user_id, created_at DESC)
  `;

  ensured = true;
}

export async function countEntrustOrdersForDay(userId: string, dayStartIso: string, dayEndIso: string): Promise<number> {
  const sql = getDb();
  await ensureEntrustOrdersTable(sql);
  const [result] = await sql`
    SELECT COUNT(*)::int AS count
    FROM entrust_orders
    WHERE user_id = ${userId}
      AND created_at >= ${dayStartIso}::timestamptz
      AND created_at < ${dayEndIso}::timestamptz
  `;
  return result?.count ?? 0;
}

export async function insertEntrustOrder(userId: string, data: EntrustFormData): Promise<EntrustOrderRecord> {
  const sql = getDb();
  await ensureEntrustOrdersTable(sql);
  const [record] = await sql`
    INSERT INTO entrust_orders (
      user_id,
      order_no,
      paper_entrust_no,
      contract_no,
      client_name,
      construction_unit,
      supervision_unit,
      contractor_unit,
      project_name,
      project_location,
      witness_name,
      witness_phone,
      sampler_name,
      sampler_phone,
      sample_name,
      sample_count,
      sample_spec,
      sample_batch,
      engineering_part,
      manufacturer,
      representative_quantity,
      production_date,
      test_items,
      test_standard,
      sample_code,
      contact_name,
      contact_phone,
      received_at,
      note,
      status,
      task_status,
      experimenter_name,
      assigned_equipment_id,
      assigned_equipment_name,
      pickup_department,
      ocr_source_name,
      source_image_name,
      source_image_path
    ) VALUES (
      ${userId},
      ${data.orderNo},
      ${data.paperEntrustNo},
      ${data.contractNo},
      ${data.clientName},
      ${data.constructionUnit},
      ${data.supervisionUnit},
      ${data.contractorUnit},
      ${data.projectName},
      ${data.projectLocation},
      ${data.witnessName},
      ${data.witnessPhone},
      ${data.samplerName},
      ${data.samplerPhone},
      ${data.sampleName},
      ${data.sampleCount},
      ${data.sampleSpec},
      ${data.sampleBatch},
      ${data.engineeringPart},
      ${data.manufacturer},
      ${data.representativeQuantity},
      ${data.productionDate},
      ${data.testItems},
      ${data.testStandard},
      ${data.sampleCode},
      ${data.contactName},
      ${data.contactPhone},
      ${data.receivedAt}::timestamptz,
      ${data.note},
      ${data.status},
      ${data.taskStatus},
      ${data.experimenterName || null},
      ${data.assignedEquipmentId || null}::uuid,
      ${data.assignedEquipmentName || null},
      ${data.pickupDepartment || null},
      ${data.ocrSourceName},
      ${data.sourceImageName},
      ${data.sourceImagePath}
    )
    RETURNING *
  `;

  return mapRecord(record);
}

export async function listEntrustOrders(userId: string): Promise<EntrustOrderRecord[]> {
  const sql = getDb();
  await ensureEntrustOrdersTable(sql);
  const records = await sql`
    SELECT *
    FROM entrust_orders
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return records.map(mapRecord);
}

export async function getEntrustOrderByOrderNo(userId: string, orderNo: string): Promise<EntrustOrderRecord | null> {
  const sql = getDb();
  await ensureEntrustOrdersTable(sql);
  const [record] = await sql`
    SELECT *
    FROM entrust_orders
    WHERE user_id = ${userId}
      AND order_no = ${orderNo}
    LIMIT 1
  `;
  return record ? mapRecord(record) : null;
}

export async function getEntrustOrderById(
  userId: string,
  id: string,
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  await ensureEntrustOrdersTable(sql);
  const [record] = await sql`
    SELECT *
    FROM entrust_orders
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
    LIMIT 1
  `;
  return record ? mapRecord(record) : null;
}

export async function updateEntrustTaskAssignment(
  userId: string,
  id: string,
  taskStatus: EntrustFormData['taskStatus'],
  experimenterName: string,
  assignment: {
    assignedEquipmentId?: string;
    assignedEquipmentName?: string;
  } = {},
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  await ensureEntrustOrdersTable(sql);
  const [record] = await sql`
    UPDATE entrust_orders
    SET
      task_status = ${taskStatus},
      experimenter_name = ${experimenterName || null},
      assigned_equipment_id = ${assignment.assignedEquipmentId || null}::uuid,
      assigned_equipment_name = ${assignment.assignedEquipmentName || null},
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
    RETURNING *
  `;
  return record ? mapRecord(record) : null;
}

export async function deleteEntrustOrder(userId: string, id: string): Promise<boolean> {
  const sql = getDb();
  await ensureEntrustOrdersTable(sql);
  const result = await sql`
    DELETE FROM entrust_orders
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
  `;
  return (result.count ?? 0) > 0;
}

export async function saveInspectionRawDataPreview(
  userId: string,
  id: string,
  payload: {
    rawDataImagePath: string;
    rawDataImageName: string;
    rawDataPreviewJson: unknown;
  },
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  await ensureEntrustOrdersTable(sql);
  const [record] = await sql`
    UPDATE entrust_orders
    SET
      raw_data_image_path = ${payload.rawDataImagePath || null},
      raw_data_image_name = ${payload.rawDataImageName || null},
      raw_data_preview_json = ${JSON.stringify(payload.rawDataPreviewJson)}::jsonb,
      ai_review_trace_json = null,
      ai_review_summary = null,
      ai_review_passed = false,
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
    RETURNING *
  `;
  return record ? mapRecord(record) : null;
}

export async function updateInspectionRawDataPreview(
  userId: string,
  id: string,
  rawDataPreviewJson: unknown,
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  await ensureEntrustOrdersTable(sql);
  const [record] = await sql`
    UPDATE entrust_orders
    SET
      raw_data_preview_json = ${JSON.stringify(rawDataPreviewJson)}::jsonb,
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
    RETURNING *
  `;
  return record ? mapRecord(record) : null;
}

export async function saveInspectionAiReviewResult(
  userId: string,
  id: string,
  payload: {
    aiReviewTraceJson: unknown;
    aiReviewSummary: string;
    aiReviewPassed: boolean;
    rawDataPreviewJson?: unknown;
  },
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  await ensureEntrustOrdersTable(sql);
  const [record] =
    payload.rawDataPreviewJson === undefined
      ? await sql`
          UPDATE entrust_orders
          SET
            ai_review_trace_json = ${JSON.stringify(payload.aiReviewTraceJson)}::jsonb,
            ai_review_summary = ${payload.aiReviewSummary || null},
            ai_review_passed = ${payload.aiReviewPassed},
            updated_at = NOW()
          WHERE user_id = ${userId}
            AND id = ${id}::uuid
          RETURNING *
        `
      : await sql`
          UPDATE entrust_orders
          SET
            raw_data_preview_json = ${JSON.stringify(payload.rawDataPreviewJson)}::jsonb,
            ai_review_trace_json = ${JSON.stringify(payload.aiReviewTraceJson)}::jsonb,
            ai_review_summary = ${payload.aiReviewSummary || null},
            ai_review_passed = ${payload.aiReviewPassed},
            updated_at = NOW()
          WHERE user_id = ${userId}
            AND id = ${id}::uuid
          RETURNING *
        `;
  return record ? mapRecord(record) : null;
}

export async function submitInspectionTaskForReview(
  userId: string,
  id: string,
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  await ensureEntrustOrdersTable(sql);
  const [record] = await sql`
    UPDATE entrust_orders
    SET
      task_status = 'awaiting_review',
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
    RETURNING *
  `;
  return record ? mapRecord(record) : null;
}

export async function approveInspectionTaskReview(
  userId: string,
  id: string,
  reviewComment: string,
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  await ensureEntrustOrdersTable(sql);
  const [record] = await sql`
    UPDATE entrust_orders
    SET
      task_status = 'awaiting_issue',
      review_comment = ${reviewComment || null},
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
    RETURNING *
  `;
  return record ? mapRecord(record) : null;
}

export async function completeInspectionTaskIssue(
  userId: string,
  id: string,
  payload: {
    issuedDocumentName: string;
    issuedDocumentUrl: string;
  },
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  await ensureEntrustOrdersTable(sql);
  const [record] = await sql`
    UPDATE entrust_orders
    SET
      task_status = 'issued',
      issued_document_name = ${payload.issuedDocumentName || null},
      issued_document_url = ${payload.issuedDocumentUrl || null},
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
    RETURNING *
  `;
  return record ? mapRecord(record) : null;
}

function mapRecord(record: any): EntrustOrderRecord {
  const parseJsonColumn = (value: unknown) => {
    if (typeof value !== 'string') return value ?? null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  return {
    id: record.id,
    orderNo: record.order_no,
    paperEntrustNo: record.paper_entrust_no ?? '',
    contractNo: record.contract_no,
    clientName: record.client_name,
    constructionUnit: record.construction_unit ?? '',
    supervisionUnit: record.supervision_unit ?? '',
    contractorUnit: record.contractor_unit ?? '',
    projectName: record.project_name,
    projectLocation: record.project_location ?? '',
    witnessName: record.witness_name ?? '',
    witnessPhone: record.witness_phone ?? '',
    samplerName: record.sampler_name ?? '',
    samplerPhone: record.sampler_phone ?? '',
    sampleName: record.sample_name,
    sampleCount: record.sample_count ?? 1,
    sampleSpec: record.sample_spec,
    sampleBatch: record.sample_batch ?? '',
    engineeringPart: record.engineering_part ?? '',
    manufacturer: record.manufacturer ?? '',
    representativeQuantity: record.representative_quantity ?? '',
    productionDate: record.production_date ?? '',
    testItems: record.test_items,
    testStandard: record.test_standard ?? '',
    sampleCode: record.sample_code ?? '',
    contactName: record.contact_name,
    contactPhone: record.contact_phone,
    receivedAt: record.received_at,
    note: record.note ?? '',
    status: record.status,
    taskStatus: normalizeInspectionTaskStatus(record.task_status),
    experimenterName: record.experimenter_name ?? '',
    assignedEquipmentId: record.assigned_equipment_id ?? '',
    assignedEquipmentName: record.assigned_equipment_name ?? '',
    pickupDepartment: record.pickup_department ?? '',
    rawDataImagePath: record.raw_data_image_path ?? '',
    rawDataImageName: record.raw_data_image_name ?? '',
    rawDataPreviewJson: parseJsonColumn(record.raw_data_preview_json),
    aiReviewTraceJson: parseJsonColumn(record.ai_review_trace_json),
    aiReviewSummary: record.ai_review_summary ?? '',
    aiReviewPassed: record.ai_review_passed ?? false,
    reviewComment: record.review_comment ?? '',
    reviewedAt: record.reviewed_at ?? '',
    issuedDocumentName: record.issued_document_name ?? '',
    issuedDocumentUrl: record.issued_document_url ?? '',
    ocrSourceName: record.ocr_source_name,
    sourceImageName: record.source_image_name ?? '',
    sourceImagePath: record.source_image_path ?? '',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
