const supabase = require('../config/db');
const logger = require('../utils/logger');

async function createJob(userId, owner, repo) {
  const { data, error } = await supabase
    .from('workflow_jobs')
    .insert({ user_id: userId, owner, repo, status: 'pending' })
    .select('id')
    .single();

  if (error) {
    logger.error({ event: 'workflow_job_create_failed', owner, repo, message: error.message });
    return null;
  }
  return data.id;
}

async function updateJob(jobId, status, { commitSha, errorMsg } = {}) {
  if (!jobId) return;
  const { error } = await supabase
    .from('workflow_jobs')
    .update({ status, commit_sha: commitSha || null, error_msg: errorMsg || null })
    .eq('id', jobId);

  if (error) {
    logger.error({ event: 'workflow_job_update_failed', jobId, message: error.message });
  }
}

module.exports = { createJob, updateJob };
