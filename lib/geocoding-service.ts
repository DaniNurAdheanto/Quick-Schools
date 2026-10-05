/**
 * Geocoding & Reverse Geocoding Service for Quick Schools
 * Synchronizes school GPS coordinates (lat, lng) with real-world Indonesian address fields
 * (Jalan/Alamat Lengkap with RT/RW, Dusun/Kampung, Kelurahan/Desa, Kecamatan, Kota/Kabupaten, Provinsi, Kode Pos).
 */

export interface ReverseGeocodeResult {
  fullAddress: string;
  street: string;
  rtRw?: string;
  kelurahan?: string;
  kecamatan?: string;
  city: string;
  province: string;
  postalCode: string;
  locationAddress: string;
  hasRtRw: boolean;
  rawDisplayName?: string;
}

// In-memory cache to prevent redundant HTTP requests and rate-limiting
const geocodeCache = new Map<string, ReverseGeocodeResult>();

/**
 * Extracts RT, RW, and Dusun/Kampung patterns from Indonesian address text or tags
 */
function extractIndonesianAddressDetails(text: string): { rtRw: string; hamletOrKampung: string } {
  if (!text) return { rtRw: "", hamletOrKampung: "" };

  // Match patterns like "RT 02 / RW 05", "RT 02 RW 05", "RT. 02 / RW. 05", "RT 003/005", "RT 02", "RW 05"
  const rtRwMatch = text.match(/(?:(?:RT|Rt|rt)\.?\s*\d+\s*(?:[\/,\-]|dan)?\s*(?:RW|Rw|rw)\.?\s*\d+)|(?:(?:RT|Rt|rt)\.?\s*\d+)|(?:(?:RW|Rw|rw)\.?\s*\d+)/);
  const rtRw = rtRwMatch ? rtRwMatch[0].trim() : "";

  // Match patterns like "Dusun X", "Kp. X", "Kampung X", "Blok X", "Banjar X"
  const kampungMatch = text.match(/(?:Dusun|Kp\.|Kampung|Blok|Banjar|Lingkungan)\s+[A-Za-z0-9\s-]+?(?=[,;]|$)/i);
  const hamletOrKampung = kampungMatch ? kampungMatch[0].trim() : "";

  return { rtRw, hamletOrKampung };
}

/**
 * Normalizes Indonesian street names (e.g. "Jalan" -> "Jl.")
 */
function formatRoadName(road: string): string {
  if (!road) return "";
  let clean = road.trim();
  if (/^jalan\s+/i.test(clean)) {
    clean = clean.replace(/^jalan\s+/i, "Jl. ");
  } else if (!/^jl\.?\s+/i.test(clean) && !/^gang\s+/i.test(clean) && !/^gg\.?\s+/i.test(clean)) {
    clean = `Jl. ${clean}`;
  }
  return clean;
}

/**
 * Cleans prefix from Indonesian administrative regions
 */
function cleanRegionName(name: string, prefixRegex: RegExp): string {
  if (!name) return "";
  return name.replace(prefixRegex, "").trim();
}

/**
 * Reverse geocodes latitude and longitude into high-detail Indonesian address components.
 * Tries OpenStreetMap Nominatim with zoom=18 and addressdetails=1 first,
 * with BigDataCloud client API as fallback.
 */
export async function reverseGeocodeGps(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Provider 1: OpenStreetMap Nominatim with maximum zoom (18) and addressdetails=1
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&namedetails=1&accept-language=id,en`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const displayName = data.display_name || "";
        const extraTags = data.extratags || {};

        // 1. Extract Road / Street / Building
        const rawRoad = addr.road || addr.street || addr.pedestrian || addr.path || addr.residential || "";
        const road = formatRoadName(rawRoad);
        const houseNumber = addr.house_number ? `No. ${addr.house_number}` : "";

        // 2. Extract RT and RW
        // Check extra tags first (OSM tag: "addr:neighbourhood" or "ref:RT" / "ref:RW")
        let rtRw = "";
        if (extraTags["ref:RT"] || extraTags["ref:RW"]) {
          const rt = extraTags["ref:RT"] ? `RT ${extraTags["ref:RT"]}` : "";
          const rw = extraTags["ref:RW"] ? `RW ${extraTags["ref:RW"]}` : "";
          rtRw = [rt, rw].filter(Boolean).join(" / ");
        }

        if (!rtRw) {
          // Check neighbourhood, hamlet, suburb, and raw display_name
          const searchCandidates = [
            addr.neighbourhood || "",
            addr.hamlet || "",
            addr.suburb || "",
            addr.quarter || "",
            extraTags["addr:neighbourhood"] || "",
            displayName,
          ].join(", ");

          const extracted = extractIndonesianAddressDetails(searchCandidates);
          rtRw = extracted.rtRw;
        }

        // 3. Extract Dusun / Kampung / Lingkungan / Kompleks
        let hamlet = addr.hamlet || addr.isolated_dwelling || "";
        if (!hamlet) {
          const extractedHamlet = extractIndonesianAddressDetails(displayName);
          hamlet = extractedHamlet.hamletOrKampung;
        }
        if (!hamlet && addr.neighbourhood && !addr.neighbourhood.toLowerCase().includes("rt")) {
          hamlet = addr.neighbourhood;
        }

        // 4. Extract Kelurahan / Desa
        let kelurahan = addr.village || addr.quarter || "";
        if (kelurahan && !/^(Desa|Kelurahan|Kel\.)\s+/i.test(kelurahan)) {
          kelurahan = `Kel. ${kelurahan}`;
        }

        // 5. Extract Kecamatan
        let kecamatan = addr.city_district || addr.district || addr.subdistrict || "";
        if (kecamatan && !/^(Kecamatan|Kec\.)\s+/i.test(kecamatan)) {
          kecamatan = `Kec. ${kecamatan}`;
        }

        // 6. Extract City / Regency (Kota / Kabupaten)
        let rawCity = addr.city || addr.town || addr.municipality || addr.county || "";
        const isKabupaten = /kabupaten/i.test(rawCity) || /kabupaten/i.test(displayName);
        const cleanCityName = cleanRegionName(rawCity, /^(Kota Administrasi|Kota|Kabupaten)\s+/i);
        const city = isKabupaten && cleanCityName ? `Kab. ${cleanCityName}` : cleanCityName || "Jakarta";

        // 7. Extract Province
        let province = (addr.state || addr.province || addr.region || "").trim();
        province = province.replace(/^(Provinsi|Daerah Khusus Ibukota)\s+/i, "DKI ");

        // 8. Extract Postal Code
        const postalCode = addr.postcode || "";

        // Assemble detailed street line: e.g. "Jl. Muhammad Musa No. 12, RT 02 / RW 05, Dusun Melati, Kel. Sukamaju, Kec. Ciawi"
        const streetParts: string[] = [];

        if (road) {
          streetParts.push(houseNumber ? `${road} ${houseNumber}` : road);
        } else if (data.name && data.name !== rawCity) {
          streetParts.push(data.name);
        }

        if (rtRw && !streetParts.join(" ").includes(rtRw)) {
          streetParts.push(rtRw);
        }

        if (hamlet && !streetParts.join(" ").toLowerCase().includes(hamlet.toLowerCase())) {
          streetParts.push(hamlet);
        }

        if (kelurahan && !streetParts.join(" ").toLowerCase().includes(kelurahan.toLowerCase())) {
          streetParts.push(kelurahan);
        }

        if (kecamatan && !streetParts.join(" ").toLowerCase().includes(kecamatan.toLowerCase())) {
          streetParts.push(kecamatan);
        }

        const street = streetParts.length > 0
          ? streetParts.join(", ")
          : (displayName.split(",").slice(0, 3).join(", ") || "Jl. Lokasi Sekolah");

        // Formulate clean full address
        const fullParts = [street, city, province, postalCode].filter(Boolean);
        const fullAddress = fullParts.join(", ");

        const locationAddress = `Kampus Utama (${city}) - Titik Koordinat GPS`;

        const result: ReverseGeocodeResult = {
          fullAddress: fullAddress || displayName || `Area Koordinat ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          street,
          rtRw: rtRw || undefined,
          kelurahan: kelurahan || undefined,
          kecamatan: kecamatan || undefined,
          city: city || "Jakarta",
          province: province || "DKI Jakarta",
          postalCode: postalCode || "",
          locationAddress,
          hasRtRw: Boolean(rtRw),
          rawDisplayName: displayName,
        };

        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode error, attempting fallback:", err);
  }

  // Provider 2: BigDataCloud Reverse Geocoding Client API (Free, high reliability client fallback)
  try {
    const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`;
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        const adminList = data.localityInfo?.administrative || [];
        
        // Find detailed administrative levels
        // Level 4: Province, Level 5/6: City/Regency, Level 7: District (Kecamatan), Level 8: Village/Subdistrict (Kelurahan)
        let kecamatan = "";
        let kelurahan = "";
        let rtRw = "";

        adminList.forEach((item: any) => {
          const order = item.adminLevel;
          const name = item.name || "";
          if (order === 7 || /kecamatan/i.test(name)) {
            kecamatan = name.startsWith("Kec.") ? name : `Kec. ${name.replace(/^Kecamatan\s+/i, "")}`;
          } else if (order === 8 || /desa|kelurahan/i.test(name)) {
            kelurahan = name.startsWith("Kel.") ? name : `Kel. ${name.replace(/^(Kelurahan|Desa)\s+/i, "")}`;
          } else if (order >= 9 || /rt|rw|dusun/i.test(name)) {
            const extracted = extractIndonesianAddressDetails(name);
            if (extracted.rtRw) rtRw = extracted.rtRw;
          }
        });

        const locality = data.locality || "";
        const city = (data.city || data.localityInfo?.administrative?.[2]?.name || "").replace(/^(Kota|Kabupaten)\s+/i, "");
        const province = data.principalSubdivision || "";
        const postalCode = data.postcode || "";

        const streetParts: string[] = [];
        if (locality) streetParts.push(`Jl. ${locality}`);
        if (rtRw) streetParts.push(rtRw);
        if (kelurahan) streetParts.push(kelurahan);
        if (kecamatan) streetParts.push(kecamatan);

        const street = streetParts.length > 0 
          ? streetParts.join(", ") 
          : `Area Koordinat GPS ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        const fullParts = [street, city, province, postalCode].filter(Boolean);

        const result: ReverseGeocodeResult = {
          fullAddress: fullParts.join(", "),
          street,
          rtRw: rtRw || undefined,
          kelurahan: kelurahan || undefined,
          kecamatan: kecamatan || undefined,
          city: city || "Jakarta",
          province: province || "DKI Jakarta",
          postalCode,
          locationAddress: `Kampus Utama (${city || "Area Sekolah"}) - Geofence GPS`,
          hasRtRw: Boolean(rtRw),
        };

        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("BigDataCloud reverse geocode fallback error:", err);
  }

  // Fallback if network fails: Construct clean placeholder from coordinates
  const fallbackResult: ReverseGeocodeResult = {
    fullAddress: `Area Sekolah - Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    street: `Titik GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    city: "Jakarta",
    province: "DKI Jakarta",
    postalCode: "",
    locationAddress: "Kampus Utama - Geofence GPS Sekolah",
    hasRtRw: false,
  };

  return fallbackResult;
}
