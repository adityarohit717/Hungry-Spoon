import prisma from '../prisma';

export interface AuditParams {
  eventType: string;
  action: string;
  entityType: string;
  entityId: string;
  performedById?: string;
  reason?: string;
  details?: Record<string, any>;
}

export const createAuditLog = async (params: AuditParams) => {
  try {
    return await prisma.auditLog.create({
      data: {
        eventType: params.eventType,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        performedById: params.performedById,
        reason: params.reason,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't crash main operation if audit log writing fails, but log error
  }
};
