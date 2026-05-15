const fs = require('fs/promises');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads/banners');
const dataFile = path.join(uploadDir, 'banners.json');
const positions = [1, 2, 3];

const defaultBanners = positions.map((position) => ({
  position,
  image_url: null,
  link: null,
  updated_at: null,
}));

const ensureStorage = async () => {
  await fs.mkdir(uploadDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch (_) {
    await fs.writeFile(dataFile, JSON.stringify(defaultBanners, null, 2));
  }
};

const normalizeBanner = (banner, position) => ({
  position,
  image_url: banner?.image_url || null,
  link: banner?.link || null,
  updated_at: banner?.updated_at || null,
});

const readBanners = async () => {
  await ensureStorage();

  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);

    return positions.map((position) => {
      const banner = Array.isArray(parsed)
        ? parsed.find((item) => Number(item.position) === position)
        : null;
      return normalizeBanner(banner, position);
    });
  } catch (_) {
    await fs.writeFile(dataFile, JSON.stringify(defaultBanners, null, 2));
    return defaultBanners;
  }
};

const writeBanners = async (banners) => {
  await ensureStorage();
  await fs.writeFile(dataFile, JSON.stringify(banners, null, 2));
};

const parsePosition = (value) => {
  const position = Number(value);
  return positions.includes(position) ? position : null;
};

exports.getBanners = async (req, res) => {
  try {
    const banners = await readBanners();
    res.json({ success: true, data: banners });
  } catch (err) {
    console.error('Get banners error:', err);
    res.status(500).json({ success: false, message: 'Khong the tai banner' });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const position = parsePosition(req.params.position);

    if (!position) {
      return res.status(400).json({
        success: false,
        message: 'Vi tri banner khong hop le',
      });
    }

    const banners = await readBanners();
    const current = banners.find((banner) => banner.position === position);
    const imageUrl = req.file
      ? `/uploads/banners/${req.file.filename}`
      : current.image_url;
    const link = Object.prototype.hasOwnProperty.call(req.body, 'link')
      ? req.body.link.trim() || null
      : current.link;

    const updated = {
      position,
      image_url: imageUrl,
      link,
      updated_at: new Date().toISOString(),
    };

    const nextBanners = banners.map((banner) =>
      banner.position === position ? updated : banner
    );
    await writeBanners(nextBanners);

    res.json({
      success: true,
      message: `Da cap nhat banner vi tri ${position}`,
      data: updated,
    });
  } catch (err) {
    console.error('Update banner error:', err);
    res.status(500).json({ success: false, message: 'Khong the cap nhat banner' });
  }
};
