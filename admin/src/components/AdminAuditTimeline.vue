<template>
  <div class="timeline">
    <p v-if="events.length === 0" class="muted">Denetim kaydı yok.</p>
    <article v-for="event in events" :key="eventKey(event)" class="timeline-item">
      <strong>{{ event.action }}</strong>
      <p>
        {{ actorLabel(event.actor) }}
        <span class="muted">{{ event.targetType }} {{ event.targetId }} üzerinde</span>
      </p>
      <p v-if="event.reason" class="muted">{{ event.reason }}</p>
      <small class="muted">{{ formatDate(event.createdAt) }}</small>
    </article>
  </div>
</template>

<script setup lang="ts">
export interface AuditActor {
  id?: string;
  email?: string;
  displayName?: string;
}

export interface AuditEvent {
  id?: string;
  actor?: AuditActor | string | null;
  actorAdminId?: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  createdAt: string;
}

defineProps<{
  events: AuditEvent[];
}>();

function eventKey(event: AuditEvent): string {
  return event.id ?? `${event.action}-${event.targetType}-${event.targetId}-${event.createdAt}`;
}

function actorLabel(actor: AuditEvent['actor']): string {
  if (!actor) return 'Sistem';
  if (typeof actor === 'string') return actor;
  return actor.displayName ?? actor.email ?? actor.id ?? 'Yönetici';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('tr-TR');
}
</script>
