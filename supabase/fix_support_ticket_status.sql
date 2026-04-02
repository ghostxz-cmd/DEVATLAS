-- Fix: Cast enum values explicitly in support_log_ticket_event trigger
-- This fixes the "Status closed" update error

CREATE OR REPLACE FUNCTION support_log_ticket_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    INSERT INTO support_ticket_events (ticket_id, event_type, actor_user_id, new_value, note)
    VALUES (
      new.id,
      'ticket_created'::support_event_type,
      auth.uid(),
      jsonb_build_object('status', new.status, 'priority', new.priority),
      'Ticket created'
    );
    RETURN new;
  END IF;

  IF tg_op = 'UPDATE' THEN
    IF old.status IS DISTINCT FROM new.status THEN
      INSERT INTO support_ticket_events (ticket_id, event_type, actor_user_id, old_value, new_value, note)
      VALUES (
        new.id,
        (CASE
          WHEN new.status = 'resolved' THEN 'ticket_resolved'::support_event_type
          WHEN new.status = 'closed' THEN 'ticket_closed'::support_event_type
          WHEN old.status IN ('resolved', 'closed') AND new.status = 'open' THEN 'ticket_reopened'::support_event_type
          ELSE 'status_changed'::support_event_type
        END),
        auth.uid(),
        jsonb_build_object('status', old.status),
        jsonb_build_object('status', new.status),
        'Status updated'
      );
    END IF;

    IF old.priority IS DISTINCT FROM new.priority THEN
      INSERT INTO support_ticket_events (ticket_id, event_type, actor_user_id, old_value, new_value, note)
      VALUES (
        new.id,
        'priority_changed'::support_event_type,
        auth.uid(),
        jsonb_build_object('priority', old.priority),
        jsonb_build_object('priority', new.priority),
        'Priority updated'
      );
    END IF;

    IF old.assigned_admin_user_id IS DISTINCT FROM new.assigned_admin_user_id THEN
      INSERT INTO support_ticket_events (ticket_id, event_type, actor_user_id, old_value, new_value, note)
      VALUES (
        new.id,
        'assigned'::support_event_type,
        auth.uid(),
        jsonb_build_object('assigned_admin_user_id', old.assigned_admin_user_id),
        jsonb_build_object('assigned_admin_user_id', new.assigned_admin_user_id),
        'Assignment changed'
      );
    END IF;

    RETURN new;
  END IF;

  RETURN new;
END;
$$;
