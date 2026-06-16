const fs = require('fs/promises');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads/banners');
const dataFile = path.join(uploadDir, 'banners.json');
const defaultPositions = [1, 2, 3];

const defaultBanners = defaultPositions.map((position) => ({
  position,
  image_url: null,
  link: null,
  is_visible: true,
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
  is_visible:
    typeof banner?.is_visible === 'boolean' ? banner.is_visible : true,
  updated_at: banner?.updated_at || null,
});

const readBanners = async () => {
  await ensureStorage();

  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    const parsedBanners = Array.isArray(parsed) ? parsed : [];
    const positionSet = new Set(defaultPositions);

    parsedBanners.forEach((item) => {
      const position = Number(item?.position);
      if (Number.isInteger(position) && position > 0) {
        positionSet.add(position);
      }
    });

    return [...positionSet].sort((a, b) => a - b).map((position) => {
      const banner = parsedBanners.find(
        (item) => Number(item.position) === position
      );
      return normalizeBanner(banner, position);
    });
  } catch (_) {
    await fs.writeFile(dataFile, JSON.stringify(defaultBanners, null, 2));
    return defaultBanners;
  }
};

const writeBanners = async (banners) => {
  await ensureStorage();
  const sortedBanners = [...banners].sort((a, b) => a.position - b.position);
  await fs.writeFile(dataFile, JSON.stringify(sortedBanners, null, 2));
};

const parsePosition = (value) => {
  const position = Number(value);
  return Number.isInteger(position) && position > 0 ? position : null;
};

const parseVisibility = (value, fallback) => {
  if (typeof value === 'undefined') return fallback;
  return value === true || value === 'true' || value === '1' || value === 'on';
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

exports.createBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui long chon anh banner',
      });
    }

    const banners = await readBanners();
    const nextPosition =
      banners.reduce(
        (maxPosition, banner) => Math.max(maxPosition, banner.position),
        0
      ) + 1;
    const link = Object.prototype.hasOwnProperty.call(req.body, 'link')
      ? req.body.link.trim() || null
      : null;

    const created = {
      position: nextPosition,
      image_url: `/uploads/banners/${req.file.filename}`,
      link,
      is_visible: parseVisibility(req.body.is_visible, true),
      updated_at: new Date().toISOString(),
    };

    await writeBanners([...banners, created]);

    res.status(201).json({
      success: true,
      message: `Da them banner vi tri ${nextPosition}`,
      data: created,
    });
  } catch (err) {
    console.error('Create banner error:', err);
    res.status(500).json({ success: false, message: 'Khong the them banner' });
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

    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay banner',
      });
    }

    const imageUrl = req.file
      ? `/uploads/banners/${req.file.filename}`
      : current.image_url;
    const link = Object.prototype.hasOwnProperty.call(req.body, 'link')
      ? req.body.link.trim() || null
      : current.link;
    const isVisible = parseVisibility(req.body.is_visible, current.is_visible);

    const updated = {
      position,
      image_url: imageUrl,
      link,
      is_visible: isVisible,
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
