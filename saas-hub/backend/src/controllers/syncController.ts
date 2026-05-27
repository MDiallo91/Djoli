import { Request, Response } from 'express';
import { Op } from 'sequelize';
import SchoolRecord from '../models/schoolRecordModel';
import sequelize from '../config/db';

const CRITICAL_ENTITIES = new Set(['grade', 'payment']);

// ── POST /api/sync/push ──────────────────────────────────────────────────────
// Receives changes from the desktop, upserts them into school_records.
// Returns conflicts for critical entities that were already modified by another device.
export const pushChanges = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.licenseData!.school_id;
    const changes: any[] = req.body.changes ?? [];

    console.log(`[Sync] PUSH from school=${schoolId} — ${changes.length} change(s)`);

    if (!Array.isArray(changes) || changes.length === 0) {
        res.status(200).json({ applied: 0, conflicts: [] });
        return;
    }

    const conflicts: any[] = [];
    const failed: string[] = [];
    let applied = 0;

    // Pre-fetch existing records for conflict detection (one query instead of N)
    const entityKeys = changes
        .filter(c => c.entity_type && c.entity_id && CRITICAL_ENTITIES.has(c.entity_type))
        .map(c => ({ entity_type: c.entity_type, entity_id: c.entity_id }));

    const existingCritical = entityKeys.length > 0
        ? await SchoolRecord.findAll({
            where: {
                school_id: schoolId,
                entity_id: { [Op.in]: entityKeys.map(k => k.entity_id) },
            },
          })
        : [];
    const existingMap = new Map(existingCritical.map(r => [`${r.entity_type}:${r.entity_id}`, r]));

    // Batch all upserts in one transaction for SQLite performance
    await sequelize.transaction(async (t) => {
        for (const change of changes) {
            const { entity_type, entity_id, payload, device_id, operation } = change;
            if (!entity_type || !entity_id) continue;

            try {
                const existing = existingMap.get(`${entity_type}:${entity_id}`);

                if (existing && CRITICAL_ENTITIES.has(entity_type) && existing.device_id !== device_id) {
                    conflicts.push({
                        entity_type,
                        entity_id,
                        local_payload:  JSON.parse(existing.data ?? '{}'),
                        remote_payload: payload,
                        server_updated_at: existing.updatedAt,
                    });
                    continue;
                }

                const dataStr = payload == null
                    ? null
                    : typeof payload === 'string' ? payload : JSON.stringify(payload);
                await SchoolRecord.upsert({
                    school_id:  schoolId,
                    entity_type,
                    entity_id,
                    data:       dataStr,
                    device_id:  device_id ?? null,
                    operation:  operation ?? 'UPDATE',
                    deleted_at: operation === 'DELETE' ? new Date() : null,
                }, { transaction: t, conflictFields: ['school_id', 'entity_type', 'entity_id'] } as any);

                applied++;
            } catch (err) {
                console.error(`[syncController push] Failed for ${entity_type}/${entity_id}:`, err);
                failed.push(entity_id);
            }
        }
    });

    res.status(200).json({ applied, conflicts, failed });
};

// ── GET /api/sync/pull ───────────────────────────────────────────────────────
// Returns all records for this school updated after `since`.
export const pullChanges = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.licenseData!.school_id;
    const since = req.query.since as string;
    console.log(`[Sync] PULL from school=${schoolId} since=${since || 'beginning'}`);

    try {
        const sinceDate = since ? new Date(since) : new Date(0);

        const records = await SchoolRecord.findAll({
            where: {
                school_id:  schoolId,
                updatedAt:  { [Op.gt]: sinceDate },
            },
            order: [['updatedAt', 'ASC']],
            limit: 500,
        });

        res.status(200).json({
            records:    records.map(r => ({
                entity_type: r.entity_type,
                entity_id:   r.entity_id,
                data:        r.data,
                device_id:   r.device_id,
                operation:   r.operation,
                updated_at:  r.updatedAt,
            })),
            server_time: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[syncController pull]', err);
        res.status(500).json({ message: 'Erreur lors du pull' });
    }
};

// ── GET /api/sync/status ─────────────────────────────────────────────────────
export const syncStatus = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.licenseData!.school_id;
    const count = await SchoolRecord.count({ where: { school_id: schoolId } });
    res.status(200).json({ school_id: schoolId, total_records: count, server_time: new Date().toISOString() });
};

// ── DELETE /api/sync/reset ───────────────────────────────────────────────────
// Wipes all school_records for this school so a force-full-sync can repopulate
// with the actual current local state. Also resets last_pull_at so the desktop
// gets a clean pull after re-syncing.
export const resetSchoolRecords = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.licenseData!.school_id;
    const { entity_types } = req.body as { entity_types?: string[] };

    try {
        const where: any = { school_id: schoolId };
        if (Array.isArray(entity_types) && entity_types.length > 0) {
            where.entity_type = entity_types;
        }
        const deleted = await SchoolRecord.destroy({ where });
        console.log(`[Sync] RESET school=${schoolId} — deleted ${deleted} records` + (entity_types ? ` (${entity_types.join(',')})` : ''));
        res.status(200).json({ deleted, school_id: schoolId });
    } catch (err) {
        console.error('[syncController reset]', err);
        res.status(500).json({ message: 'Erreur lors du reset' });
    }
};
