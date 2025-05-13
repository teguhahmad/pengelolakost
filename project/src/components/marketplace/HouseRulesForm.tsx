import React, { useState } from 'react';
import Button from '../ui/Button';
import { X, Plus, ImageIcon, Loader2, Trash } from 'lucide-react';

interface HouseRulesFormProps {
  rules: string[];
  photos: string[];
  onSave: (rules: string[], photos: string[]) => void;
  onClose: () => void;
}

const HOUSE_RULES = {
  general: [
    'Maksimal 2 orang/kamar',
    'Ada jam malam untuk tamu (22:00)',
    'Dilarang masuk setelah pukul 23:00',
    'Wajib menunjukkan hasil tes antigen saat check-in (untuk penyewaan harian)'
  ],
  visitors: [
    'Dilarang menerima tamu di kamar',
    'Dilarang membawa anak-anak ke dalam kamar',
    'Dilarang membawa hewan peliharaan ke dalam kamar',
    'Dilarang merokok di dalam kamar'
  ],
  checkInOut: [
    'Check-in: Pukul 14:00 - 21:00 (untuk penyewaan harian)',
    'Check-out: Pukul 12:00 (untuk penyewaan harian)',
    'Denda akan dikenakan jika terjadi kerusakan pada barang-barang dalam kamar'
  ],
  requirements: [
    'Wajib menunjukkan KTP saat check-in (untuk penyewaan harian)',
    'Pasutri wajib membawa surat nikah saat check-in (untuk penyewaan harian)',
    'Tidak ada DP (untuk penyewaan harian)'
  ],
  others: [
    'Tidak diperbolehkan membawa alat elektronik tertentu (seperti mesin fotokopi atau printer)',
    'Tanpa deposit (untuk penyewaan harian)',
    'Termasuk listrik dalam biaya sewa',
    'Kamar hanya boleh digunakan oleh penyewa, tidak boleh disewakan lagi kepada pihak lain'
  ]
};

const HouseRulesForm: React.FC<HouseRulesFormProps> = ({
  rules,
  photos,
  onSave,
  onClose
}) => {
  const [selectedRules, setSelectedRules] = useState<string[]>(rules);
  const [customRule, setCustomRule] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [rulePhotos, setRulePhotos] = useState<string[]>(photos);

  const handleToggleRule = (rule: string) => {
    setSelectedRules(prev =>
      prev.includes(rule)
        ? prev.filter(r => r !== rule)
        : [...prev, rule]
    );
  };

  const handleAddCustomRule = () => {
    if (customRule.trim()) {
      setSelectedRules(prev => [...prev, customRule.trim()]);
      setCustomRule('');
    }
  };

  const handleRemoveRule = (rule: string) => {
    setSelectedRules(prev => prev.filter(r => r !== rule));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls = [];
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'rules');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-image`,
          {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        const { url } = await response.json();
        uploadedUrls.push(url);
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      setRulePhotos(prev => [...prev, ...uploadedUrls]);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePhoto = async (url: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-image`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ url })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      setRulePhotos(prev => prev.filter(photo => photo !== url));
    } catch (error) {
      console.error('Error removing photo:', error);
      alert('Failed to remove photo. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">Peraturan Kost</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* General Rules */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Umum</h3>
            <div className="space-y-2">
              {HOUSE_RULES.general.map((rule) => (
                <label key={rule} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule)}
                    onChange={() => handleToggleRule(rule)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{rule}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Visitor Rules */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">2. Tamu dan Pengunjung</h3>
            <div className="space-y-2">
              {HOUSE_RULES.visitors.map((rule) => (
                <label key={rule} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule)}
                    onChange={() => handleToggleRule(rule)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{rule}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Check-in/out Rules */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">3. Check-In dan Check-Out</h3>
            <div className="space-y-2">
              {HOUSE_RULES.checkInOut.map((rule) => (
                <label key={rule} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule)}
                    onChange={() => handleToggleRule(rule)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{rule}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rental Requirements */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">4. Syarat Penyewaan</h3>
            <div className="space-y-2">
              {HOUSE_RULES.requirements.map((rule) => (
                <label key={rule} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule)}
                    onChange={() => handleToggleRule(rule)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{rule}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Other Rules */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">5. Lain-Lain</h3>
            <div className="space-y-2">
              {HOUSE_RULES.others.map((rule) => (
                <label key={rule} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule)}
                    onChange={() => handleToggleRule(rule)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{rule}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Rules */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Peraturan Tambahan</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customRule}
                  onChange={(e) => setCustomRule(e.target.value)}
                  placeholder="Tambah peraturan baru..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={handleAddCustomRule}
                  disabled={!customRule.trim()}
                  icon={<Plus size={16} />}
                >
                  Tambah
                </Button>
              </div>

              <div className="space-y-2">
                {selectedRules.filter(rule => 
                  !Object.values(HOUSE_RULES).flat().includes(rule)
                ).map((rule) => (
                  <div key={rule} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                    <span className="text-gray-700">{rule}</span>
                    <button
                      onClick={() => handleRemoveRule(rule)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Foto Peraturan</h3>
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                icon={isUploading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                className="w-full"
              >
                {isUploading ? 'Mengupload...' : 'Upload Foto Peraturan'}
              </Button>

              {isUploading && (
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    {Math.round(uploadProgress)}% selesai
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {rulePhotos.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`House rule photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(url)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={() => onSave(selectedRules, rulePhotos)}>
              Simpan Peraturan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseRulesForm;