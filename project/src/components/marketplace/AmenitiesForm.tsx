import React, { useState } from 'react';
import Button from '../ui/Button';
import { X, Plus } from 'lucide-react';

interface AmenitiesFormProps {
  title: string;
  amenities: string[];
  onSave: (amenities: string[]) => void;
  onClose: () => void;
  suggestions?: string[];
}

const AmenitiesForm: React.FC<AmenitiesFormProps> = ({
  title,
  amenities,
  onSave,
  onClose,
  suggestions = []
}) => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(amenities);
  const [newAmenity, setNewAmenity] = useState('');

  const handleAddAmenity = () => {
    if (newAmenity.trim()) {
      setSelectedAmenities(prev => [...prev, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    setSelectedAmenities(prev => prev.filter(a => a !== amenity));
  };

  const handleToggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedAmenities);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Custom Amenity Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tambah Fasilitas Baru
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Masukkan nama fasilitas..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                type="button"
                onClick={handleAddAmenity}
                disabled={!newAmenity.trim()}
                icon={<Plus size={16} />}
              >
                Tambah
              </Button>
            </div>
          </div>

          {/* Suggested Amenities */}
          {suggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Fasilitas yang Tersedia
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(amenity => (
                  <label
                    key={amenity}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedAmenities.includes(amenity)
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity)}
                      onChange={() => handleToggleAmenity(amenity)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Selected Amenities */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Fasilitas yang Dipilih
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedAmenities.map((amenity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg"
                >
                  <span>{amenity}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAmenity(amenity)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {selectedAmenities.length === 0 && (
                <p className="text-sm text-gray-500">
                  Belum ada fasilitas yang dipilih
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AmenitiesForm;