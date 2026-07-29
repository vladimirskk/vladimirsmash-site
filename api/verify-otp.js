const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: 'Date lipsă' });
    const digits = phone.replace(/\D/g, '');
    const e164 = digits.startsWith('40') ? '+' + digits : '+40' + digits.replace(/^0/, '');

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('otp_codes').select('*').eq('phone', e164).single();
    if (error || !data) return res.status(400).json({ valid: false, error: 'Cod inexistent, cere unul nou' });
    if (new Date(data.expires_at) < new Date()) return res.status(400).json({ valid: false, error: 'Codul a expirat, cere unul nou' });
    if (data.code !== String(code).trim()) return res.status(400).json({ valid: false, error: 'Cod greșit' });

    await supabase.from('otp_codes').update({ verified: true }).eq('phone', e164);
    return res.status(200).json({ valid: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ valid: false, error: 'Eroare server' });
  }
};
