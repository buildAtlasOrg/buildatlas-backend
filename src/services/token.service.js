const supabase = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto');

async function storeToken(userId, accessToken) {
  const { encrypted, iv, authTag } = encrypt(accessToken);
  const { error } = await supabase
    .from('user_tokens')
    .upsert(
      { user_id: userId, encrypted_token: encrypted, iv, auth_tag: authTag },
      { onConflict: 'user_id' }
    );
  if (error) throw new Error(`Failed to store token: ${error.message}`);
}

async function getToken(userId) {
  const { data, error } = await supabase
    .from('user_tokens')
    .select('encrypted_token, iv, auth_tag')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return decrypt({ encrypted: data.encrypted_token, iv: data.iv, authTag: data.auth_tag });
}

async function deleteToken(userId) {
  const { error } = await supabase
    .from('user_tokens')
    .delete()
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to delete token: ${error.message}`);
}

module.exports = { storeToken, getToken, deleteToken };
