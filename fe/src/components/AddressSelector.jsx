import { useState, useEffect } from 'react';

const AddressSelector = ({ onChange }) => {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [detail, setDetail] = useState('');

  const BASE = 'https://provinces.open-api.vn/api';

  // Load danh sách tỉnh
  useEffect(() => {
    fetch(`${BASE}/?depth=1`)
      .then(r => r.json())
      .then(setProvinces);
  }, []);

  // Load huyện khi chọn tỉnh
  const handleProvinceChange = async (e) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvince({ code, name });
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    if (!code) return;
    const res = await fetch(`${BASE}/p/${code}?depth=2`);
    const data = await res.json();
    setDistricts(data.districts || []);
    notifyChange({ province: name, district: '', ward: '', detail });
  };

  // Load xã khi chọn huyện
  const handleDistrictChange = async (e) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedDistrict({ code, name });
    setSelectedWard(null);
    setWards([]);
    if (!code) return;
    const res = await fetch(`${BASE}/d/${code}?depth=2`);
    const data = await res.json();
    setWards(data.wards || []);
    notifyChange({ province: selectedProvince?.name, district: name, ward: '', detail });
  };

  const handleWardChange = (e) => {
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedWard(name);
    notifyChange({ province: selectedProvince?.name, district: selectedDistrict?.name, ward: name, detail });
  };

  const handleDetailChange = (e) => {
    setDetail(e.target.value);
    notifyChange({ province: selectedProvince?.name, district: selectedDistrict?.name, ward: selectedWard, detail: e.target.value });
  };

  const notifyChange = ({ province, district, ward, detail }) => {
    const parts = [detail, ward, district, province].filter(Boolean);
    onChange(parts.join(', '));
  };

  const selectClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white";

  return (
    <div className="space-y-3">
      {/* Tỉnh / Thành phố */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Tỉnh / Thành phố <span className="text-red-500">*</span>
        </label>
        <select onChange={handleProvinceChange} defaultValue="" className={selectClass}>
          <option value="">-- Chọn Tỉnh / Thành phố --</option>
          {provinces.map(p => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Quận / Huyện */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Quận / Huyện <span className="text-red-500">*</span>
        </label>
        <select onChange={handleDistrictChange} defaultValue="" disabled={!districts.length} className={selectClass}>
          <option value="">-- Chọn Quận / Huyện --</option>
          {districts.map(d => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Phường / Xã */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Phường / Xã <span className="text-red-500">*</span>
        </label>
        <select onChange={handleWardChange} defaultValue="" disabled={!wards.length} className={selectClass}>
          <option value="">-- Chọn Phường / Xã --</option>
          {wards.map(w => (
            <option key={w.code} value={w.code}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Địa chỉ chi tiết */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Số nhà, tên đường <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={detail}
          onChange={handleDetailChange}
          className={selectClass}
        />
      </div>
    </div>
  );
};

export default AddressSelector;