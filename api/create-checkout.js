module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  if (!process.env.POLAR_ACCESS_TOKEN || !process.env.POLAR_PRODUCT_ID) {
    return res.status(503).json({ error: 'Polar ödeme ayarları henüz tamamlanmadı.' });
  }
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const forwarded = req.headers['x-forwarded-for'];
  const customerIpAddress = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined;
  try {
    const response = await fetch(`${process.env.POLAR_SERVER || 'https://api.polar.sh/v1'}/checkouts/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` },
      body: JSON.stringify({ products: [process.env.POLAR_PRODUCT_ID], success_url: `${origin}/?payment=success`, return_url: origin, customer_ip_address: customerIpAddress, metadata: { product: 'ebookera-creator' } })
    });
    const checkout = await response.json();
    if (!response.ok) throw new Error(checkout?.detail || 'Polar checkout oluşturulamadı.');
    res.status(200).json({ url: checkout.url });
  } catch (error) { res.status(500).json({ error: error.message || 'Ödeme başlatılamadı.' }); }
};
