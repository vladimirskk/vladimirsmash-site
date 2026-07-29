const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { phone } = req.body || {};
    if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 9) {
      return res.status(400).json({ error: 'Număr de telefon invalid' });
    }
    const digits = phone.replace(/\D/g, '');
    const e164 = digits.startsWith('40') ? '+' + digits : '+40' + digits.replace(/^0/, '');

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbError } = await supabase.from('otp_codes').upsert(
      { phone: e164, code, expires_at: expiresAt, verified: false },
      { onConflict: 'phone' }
    );
    if (dbError) { console.error(dbError); return res.status(500).json({ error: 'Eroare bază de date' }); }

    const smsRes = await fetch('https://www.smsadvert.ro/api/sms/', {
      method: 'POST',
      headers: { Authorization: process.env.SMSADVERT_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: e164,
        shortTextMessage: 'Codul tau Vladimir Smash: ' + code,
        sendAsShort: true
      })
    });
    if (!smsRes.ok) {
      const t = await smsRes.text();
      console.error('SMS send failed', t);
      return res.status(502).json({ error: 'Nu am putut trimite SMS-ul' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Eroare server' });
  }
};
