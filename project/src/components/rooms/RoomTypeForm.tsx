import React, { useState, useRef } from 'react';
import { RoomType } from '../../types';
import Button from '../ui/Button';
import { X, ImageIcon, Loader2, Trash, Upload, Plus, Minus, DoorClosed, Bath, Users, Calendar, CreditCard } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface RoomTypeFormProps {
  roomType?: RoomType;
  onSubmit: (data: Partial<RoomType>) => void;
  onClose: () => void;
}

const ROOM_FACILITIES = [
  'AC', 'TV', 'WiFi', 'Lemari', 'Meja', 'Kursi', 'Kasur Single', 'Kasur Double'
];

const BATHROOM_FACILITIES = [
  'Kamar Mandi Dalam', 'Shower', 'Water Heater', 'Kloset Duduk', 'Wastafel'
];

const RoomTypeForm: React.FC<RoomTypeFormProps> = ({
  roomType,
  onSubmit,
  onClose
}) => {
  const [formData, setFormData] = useState<Partial<RoomType>>({
    name: roomType?.name || '',
    price: roomType?.price || 0,
    daily_price: roomType?.daily_price || 0,
    weekly_price: roomType?.weekly_price || 0,
    yearly_price: roomType?.yearly_price || 0,
    enable_daily_price: roomType?.enable_daily_price || false,
    enable_weekly_price: roomType?.enable_weekly_price || false,
    enable_yearly_price: roomType?.enable_yearly_price || false,
    description: roomType?.description || '',
    room_facilities: roomType?.room_facilities || [],
    bathroom_facilities: roomType?.bathroom_facilities || [],
    photos: roomType?.photos || [],
    max_occupancy: roomType?.max_occupancy || 1,
    renter_gender: roomType?.renter_gender || 'any'
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleFacilityChange = (facility: string, type: 'room' | 'bathroom') => {
    const field = type === 'room' ? 'room_facilities' : 'bathroom_facilities';
    const facilities = formData[field] || [];
    const newFacilities = facilities.includes(facility)
      ? facilities.filter(f => f !== facility)
      : [...facilities, facility];
    
    setFormData(prev => ({
      ...prev,
      [field]: newFacilities
    }));
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
        
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          onProgress: (progress: number) => {
            setUploadProgress((i / totalFiles * 100) + (progress / totalFiles));
          }
        };

        const compressedFile = await imageCompression(file, options);
        
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('type', 'room');

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

      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), ...uploadedUrls]
      }));

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

  const handleRemovePhoto = async (url: string) => {
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

      setFormData(prev => ({
        ...prev,
        photos: prev.photos?.filter(photo => photo !== url) || []
      }));
    } catch (error) {
      console.error('Error removing photo:', error);
      alert('Failed to remove photo. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-semibold text-gray-800">
            {roomType ? 'Edit Tipe Kamar' : 'Tambah Tipe Kamar'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
              <DoorClosed size={24} className="text-blue-600" />
              Informasi Dasar
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Tipe
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kapasitas Maksimal
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      max_occupancy: Math.max(1, (prev.max_occupancy || 1) - 1)
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-l-lg hover:bg-gray-50"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    name="max_occupancy"
                    value={formData.max_occupancy}
                    onChange={handleChange}
                    min="1"
                    max="5"
                    className="w-20 px-3 py-2 border-y border-gray-300 text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      max_occupancy: Math.min(5, (prev.max_occupancy || 1) + 1)
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-r-lg hover:bg-gray-50"
                  >
                    <Plus size={16} />
                  </button>
                  <span className="ml-3 text-gray-600">orang</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Kelamin Penyewa
                </label>
                <select
                  name="renter_gender"
                  value={formData.renter_gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="male">Laki-Laki</option>
                  <option value="female">Perempuan</option>
                  <option value="any">Campur</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harga per Bulan
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Deskripsikan tipe kamar ini..."
              />
            </div>
          </div>

          {/* Price Options */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
              <CreditCard size={24} className="text-blue-600" />
              Opsi Harga Tambahan
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="enable_daily_price"
                    checked={formData.enable_daily_price}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">
                    Harga Harian
                  </label>
                  {formData.enable_daily_price && (
                    <div className="mt-2 relative">
                      <span className="absolute left-4 top-2 text-gray-500">Rp</span>
                      <input
                        type="number"
                        name="daily_price"
                        value={formData.daily_price}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="enable_weekly_price"
                    checked={formData.enable_weekly_price}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">
                    Harga Mingguan
                  </label>
                  {formData.enable_weekly_price && (
                    <div className="mt-2 relative">
                      <span className="absolute left-4 top-2 text-gray-500">Rp</span>
                      <input
                        type="number"
                        name="weekly_price"
                        value={formData.weekly_price}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="enable_yearly_price"
                    checked={formData.enable_yearly_price}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">
                    Harga Tahunan
                  </label>
                  {formData.enable_yearly_price && (
                    <div className="mt-2 relative">
                      <span className="absolute left-4 top-2 text-gray-500">Rp</span>
                      <input
                        type="number"
                        name="yearly_price"
                        value={formData.yearly_price}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Facilities */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
              <DoorClosed size={24} className="text-blue-600" />
              Fasilitas Kamar
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ROOM_FACILITIES.map(facility => (
                <label
                  key={facility}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.room_facilities?.includes(facility)
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.room_facilities?.includes(facility)}
                    onChange={() => handleFacilityChange(facility, 'room')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{facility}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
              <Bath size={24} className="text-blue-600" />
              Fasilitas Kamar Mandi
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BATHROOM_FACILITIES.map(facility => (
                <label
                  key={facility}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.bathroom_facilities?.includes(facility)
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.bathroom_facilities?.includes(facility)}
                    onChange={() => handleFacilityChange(facility, 'bathroom')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{facility}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
              <ImageIcon size={24} className="text-blue-600" />
              Foto Kamar
            </div>
            
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
                icon={isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                className="w-full"
              >
                {isUploading ? 'Mengupload...' : 'Upload Foto'}
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
                {formData.photos?.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`Room type photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(url)}
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
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 flex justify-end gap-3 rounded-b-2xl">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              {roomType ? 'Simpan Perubahan' : 'Tambah Tipe'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomTypeForm;
