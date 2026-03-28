const supabase = require('../config/db');
const logger = require('../utils/logger');

async function recordAuthEvent(eventType, userId, ipAddress) {
  const { error } = await supabase
    .from('auth_events')
    .insert({ event_type: eventType, user_id: userId || null, ip_address: ipAddress || null });

  if (error) {
    logger.error({ event: 'auth_event_persist_failed', eventType, message: error.message });
  }
}

module.exports = { recordAuthEvent };
