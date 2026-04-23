import { useState, useEffect, useRef } from "react";

const BASE = "https://provinces.open-api.vn/api";

const AddressSelector = ({ onChange, defaultValue = null }) => {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  // Các giá trị được controlled — khởi tạo từ defaultValue nếu có
  const [provCode, setProvCode] = useState(defaultValue?.provinceCode ?? "");
  const [provName, setProvName] = useState(defaultValue?.provinceName ?? "");
  const [distCode, setDistCode] = useState(defaultValue?.districtCode ?? "");
  const [distName, setDistName] = useState(defaultValue?.districtName ?? "");
  const [wardCode, setWardCode] = useState(defaultValue?.wardCode ?? "");
  const [wardName, setWardName] = useState(defaultValue?.wardName ?? "");
  const [detail, setDetail] = useState(defaultValue?.detailAddress ?? "");

  const isMounted = useRef(false);

  // ── Load tỉnh 1 lần ──
  useEffect(() => {
    fetch(`${BASE}/?depth=1`)
      .then((r) => r.json())
      .then(setProvinces);
  }, []);

  // ── Load huyện khi provCode thay đổi (cả lúc prefill lẫn user chọn) ──
  useEffect(() => {
    if (!provCode) {
      setDistricts([]);
      setWards([]);
      return;
    }
    fetch(`${BASE}/p/${provCode}?depth=2`)
      .then((r) => r.json())
      .then((data) => setDistricts(data.districts || []));
  }, [provCode]);

  // ── Load xã khi distCode thay đổi ──
  useEffect(() => {
    if (!distCode) {
      setWards([]);
      return;
    }
    fetch(`${BASE}/d/${distCode}?depth=2`)
      .then((r) => r.json())
      .then((data) => setWards(data.wards || []));
  }, [distCode]);

  // ── Notify parent mỗi khi user thay đổi (bỏ qua mount đầu) ──
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const parts = [detail, wardName, distName, provName].filter(Boolean);
    onChange?.({
      provinceCode: provCode,
      provinceName: provName,
      districtCode: distCode,
      districtName: distName,
      wardCode,
      wardName,
      detailAddress: detail,
      fullAddress: parts.join(", "),
    });
  }, [provCode, distCode, wardCode, detail]); // eslint-disable-line

  // ── Handlers ──
  const handleProvince = (e) => {
    const code = e.target.value;
    const name = provinces.find((p) => String(p.code) === code)?.name ?? "";
    setProvCode(code);
    setProvName(name);
    setDistCode("");
    setDistName(""); // reset huyện + xã
    setWardCode("");
    setWardName("");
  };

  const handleDistrict = (e) => {
    const code = e.target.value;
    const name = districts.find((d) => String(d.code) === code)?.name ?? "";
    setDistCode(code);
    setDistName(name);
    setWardCode("");
    setWardName(""); // reset xã
  };

  const handleWard = (e) => {
    const code = e.target.value;
    const name = wards.find((w) => String(w.code) === code)?.name ?? "";
    setWardCode(code);
    setWardName(name);
  };

  const cls =
    "w-full px-4 py-2.5 border border-gray-300 rounded-lg " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white " +
    "disabled:bg-gray-100 disabled:cursor-not-allowed";

  return (
    <div className="space-y-3">
      {/* Tỉnh / Thành phố */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Tỉnh / Thành phố <span className="text-red-500">*</span>
        </label>
        <select value={provCode} onChange={handleProvince} className={cls}>
          <option value="">-- Chọn Tỉnh / Thành phố --</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quận / Huyện */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Quận / Huyện <span className="text-red-500">*</span>
        </label>
        <select
          value={distCode}
          onChange={handleDistrict}
          disabled={!districts.length}
          className={cls}
        >
          <option value="">-- Chọn Quận / Huyện --</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Phường / Xã */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Phường / Xã <span className="text-red-500">*</span>
        </label>
        <select
          value={wardCode}
          onChange={handleWard}
          disabled={!wards.length}
          className={cls}
        >
          <option value="">-- Chọn Phường / Xã --</option>
          {wards.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* Số nhà, tên đường */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Số nhà, tên đường <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className={cls}
        />
      </div>
    </div>
  );
};

export default AddressSelector;
