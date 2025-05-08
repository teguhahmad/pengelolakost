import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import RoomTypeForm from '../components/rooms/RoomTypeForm';
import { Property, RoomType } from '../types';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { 
  Store, 
  Plus, 
  X, 
  Eye, 
  EyeOff, 
  Globe, 
  CheckCircle, 
  Trash, 
  Loader2, 
  ImageIcon, 
  AlertTriangle,
  Building2,
  DoorClosed,
  Pencil,
  Settings2
} from 'lucide-react';
import FeatureGuard from '../components/ui/FeatureGuard';

interface ImageUploadProps {
  type: 'common' | 'parking';
  images: string[];
  onUpload: (url: string) => void;
  onDelete: (url: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ type, images, onUpload, onDelete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);

      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }

      const { url } = await response.json();
      onUpload(url);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (url: string) => {
    try {
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-image`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete image');
      }

      onDelete(url);
    } catch (err) {
      console.error('Error deleting image:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="relative cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            disabled={isUploading}
            icon={isUploading ? <Loader2 className="animate-spin" /> : <ImageIcon />}
          >
            Upload Gambar
          </Button>
        </label>
      </div>

      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((url, index) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={url}
              alt={`${type} facility ${index + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              onClick={() => handleDelete(url)}
              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MarketplaceSettings: React.FC = () => {
  const { selectedProperty } = useProperty();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRoomTypeForm, setShowRoomTypeForm] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | undefined>();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [affectedRooms, setAffectedRooms] = useState<{ id: string; name: string; }[]>([]);
  const [showAffectedRoomsModal, setShowAffectedRoomsModal] = useState(false);
  const [pendingRoomTypeUpdate, setPendingRoomTypeUpdate] = useState<Partial<RoomType> | null>(null);
  
  const [settings, setSettings] = useState({
    marketplace_enabled: false,
    marketplace_status: 'draft' as 'draft' | 'published',
    description: '',
    common_amenities: [] as string[],
    parking_amenities: [] as string[],
    common_amenities_photos: [] as string[],
    parking_amenities_photos: [] as string[],
    rules: [] as string[],
    photos: [] as string[]
  });

  useEffect(() => {
    if (selectedProperty?.id) {
      loadSettings();
      loadRoomTypes();
    }
  }, [selectedProperty]);

  const loadSettings = async () => {
    if (!selectedProperty) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', selectedProperty.id)
        .single();

      if (propertyError) throw propertyError;

      setSettings({
        marketplace_enabled: property.marketplace_enabled || false,
        marketplace_status: property.marketplace_status || 'draft',
        description: property.description || '',
        common_amenities: property.common_amenities || [],
        parking_amenities: property.parking_amenities || [],
        common_amenities_photos: property.common_amenities_photos || [],
        parking_amenities_photos: property.parking_amenities_photos || [],
        rules: property.rules || [],
        photos: property.photos || []
      });
    } catch (err) {
      console.error('Error loading marketplace settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoomTypes = async () => {
    if (!selectedProperty) return;
    
    try {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .eq('property_id', selectedProperty.id)
        .order('name');

      if (error) throw error;
      setRoomTypes(data || []);
    } catch (err) {
      console.error('Error loading room types:', err);
      setError('Failed to load room types');
    }
  };

  const handleRoomTypeSubmit = async (data: Partial<RoomType>) => {
    if (!selectedProperty) return;

    try {
      setIsLoading(true);
      setError(null);

      if (editingRoomType) {
        const { data: existingRooms, error: roomsError } = await supabase
          .from('rooms')
          .select('id, name, type')
          .eq('type', editingRoomType.name)
          .eq('property_id', selectedProperty.id);

        if (roomsError) throw roomsError;

        if (existingRooms?.length > 0 && data.name !== editingRoomType.name) {
          setAffectedRooms(existingRooms);
          setPendingRoomTypeUpdate(data);
          setShowAffectedRoomsModal(true);
          return;
        }

        const { error: updateError } = await supabase
          .from('room_types')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRoomType.id);

        if (updateError) throw updateError;

        if (data.name !== editingRoomType.name && existingRooms?.length > 0) {
          const { error: roomsUpdateError } = await supabase
            .from('rooms')
            .update({ type: data.name })
            .eq('property_id', selectedProperty.id)
            .eq('type', editingRoomType.name);

          if (roomsUpdateError) throw roomsUpdateError;
        }
      } else {
        const { error } = await supabase
          .from('room_types')
          .insert([{
            ...data,
            property_id: selectedProperty.id
          }]);

        if (error) throw error;
      }

      await loadRoomTypes();
      setShowRoomTypeForm(false);
      setEditingRoomType(undefined);
      setPendingRoomTypeUpdate(null);
      setAffectedRooms([]);
    } catch (err) {
      console.error('Error saving room type:', err);
      setError(err instanceof Error ? err.message : 'Failed to save room type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoomType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room type?')) return;

    try {
      setIsLoading(true);
      setError(null);

      const roomType = roomTypes.find(rt => rt.id === id);
      if (!roomType) throw new Error('Room type not found');

      const { data: existingRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('type', roomType.name)
        .eq('property_id', selectedProperty?.id);

      if (roomsError) throw roomsError;

      if (existingRooms && existingRooms.length > 0) {
        throw new Error(`Tipe kamar tidak dapat dihapus karena sedang digunakan oleh ${existingRooms.length} kamar.  Silakan ubah kamar-kamar tersebut ke tipe lain terlebih dahulu, atau hapus kamar (tidak disarankan).`);
      }

      const { error } = await supabase
        .from('room_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadRoomTypes();
    } catch (err) {
      console.error('Error deleting room type:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete room type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMarketplace = async () => {
    if (!selectedProperty) return;

    try {
      setIsSaving(true);
      setError(null);

      const newEnabled = !settings.marketplace_enabled;

      const { error } = await supabase
        .from('properties')
        .update({
          marketplace_enabled: newEnabled,
          marketplace_status: newEnabled ? 'published' : 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        marketplace_enabled: newEnabled,
        marketplace_status: newEnabled ? 'published' : 'draft'
      }));

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error toggling marketplace:', err);
      setError('Failed to update marketplace status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedProperty) return;
    
    try {
      setIsSaving(true);
      setError(null);

      const { error } = await supabase
        .from('properties')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPhoto = async (url: string, type: 'common' | 'parking') => {
    if (!selectedProperty) return;

    try {
      const updatedPhotos = type === 'common' 
        ? [...settings.common_amenities_photos, url]
        : [...settings.parking_amenities_photos, url];

      const updateData = type === 'common'
        ? { common_amenities_photos: updatedPhotos }
        : { parking_amenities_photos: updatedPhotos };

      const { error } = await supabase
        .from('properties')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        ...(type === 'common' 
          ? { common_amenities_photos: updatedPhotos }
          : { parking_amenities_photos: updatedPhotos })
      }));
    } catch (err) {
      console.error('Error adding photo:', err);
      setError('Failed to add photo');
      throw err;
    }
  };

  const handleDeletePhoto = async (url: string, type: 'common' | 'parking') => {
    if (!selectedProperty) return;

    try {
      const updatedPhotos = type === 'common'
        ? settings.common_amenities_photos.filter(photo => photo !== url)
        : settings.parking_amenities_photos.filter(photo => photo !== url);

      const updateData = type === 'common'
        ? { common_amenities_photos: updatedPhotos }
        : { parking_amenities_photos: updatedPhotos };

      const { error } = await supabase
        .from('properties')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        ...(type === 'common'
          ? { common_amenities_photos: updatedPhotos }
          : { parking_amenities_photos: updatedPhotos })
      }));
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Failed to delete photo');
      throw err;
    }
  };

  if (!selectedProperty?.id) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please select a property to view marketplace settings
      </div>
    );
  }

  return (
    <FeatureGuard 
      feature="marketplace_listing"
      fallback={
        <div className="p-6 text-center text-gray-500">
          Marketplace listing is not available in your current plan.
          Please upgrade to list your property in the marketplace.
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Store className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pengaturan Marketplace</h1>
              <p className="text-gray-500">Kelola tampilan properti Anda di marketplace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.marketplace_enabled}
                  onChange={handleToggleMarketplace}
                  className="sr-only peer"
                  disabled={isSaving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {settings.marketplace_enabled ? 'Aktif di Marketplace' : 'Nonaktif di Marketplace'}
              </span>
            </div>
            <Button
              variant={settings.marketplace_status === 'published' ? 'success' : 'primary'}
              onClick={() => setSettings(prev => ({
                ...prev,
                marketplace_status: prev.marketplace_status === 'published' ? 'draft' : 'published'
              }))}
              icon={<Globe size={16} />}
              disabled={!settings.marketplace_enabled || isSaving}
            >
              {settings.marketplace_status === 'published' ? 'Published' : 'Draft'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {showSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Pengaturan berhasil disimpan!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Property Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Description */}
            <Card>
              <CardHeader className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Deskripsi Properti</h2>
              </CardHeader>
              <CardContent>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Berikan deskripsi lengkap tentang properti Anda..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  Berikan informasi yang lengkap tentang properti Anda, termasuk lokasi strategis, 
                  fasilitas umum, dan hal-hal menarik lainnya.
                </p>
              </CardContent>
            </Card>

            {/* Room Types */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DoorClosed className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Tipe Kamar</h2>
                </div>
                <Button
                  onClick={() => {
                    setEditingRoomType(undefined);
                    setShowRoomTypeForm(true);
                  }}
                  icon={<Plus size={16} />}
                >
                  Tambah Tipe Kamar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {roomTypes.map(roomType => (
                    <div
                      key={roomType.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{roomType.name}</h3>
                          <p className="text-sm text-gray-500">{roomType.description}</p>
                        </div>
                        <p className="text-lg font-bold text-blue-600">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR'
                          }).format(roomType.price)}
                          <span className="text-sm text-gray-500">/bulan</span>
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Kapasitas</span>
                          <span className="font-medium">{roomType.max_occupancy} orang</span>
                        </div>
                        
                        {roomType.enable_daily_price && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Harga Harian</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR'
                              }).format(roomType.daily_price || 0)}
                            </span>
                          </div>
                        )}

                        {roomType.enable_weekly_price && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Harga Mingguan</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR'
                              }).format(roomType.weekly_price || 0)}
                            </span>
                          </div>
                        )}

                        {roomType.enable_yearly_price && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Harga Tahunan</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR'
                              }).format(roomType.yearly_price || 0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {(roomType.room_facilities?.length > 0 || roomType.bathroom_facilities?.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {roomType.room_facilities?.map((facility, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                              >
                                {facility}
                              </span>
                            ))}
                            {roomType.bathroom_facilities?.map((facility, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs"
                              >
                                {facility}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingRoomType(roomType);
                            setShowRoomTypeForm(true);
                          }}
                          icon={<Pencil size={14} />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteRoomType(roomType.id)}
                          icon={<Trash size={14} />}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  ))}

                  {roomTypes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Belum ada tipe kamar yang ditambahkan
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Common Amenities */}
            <Card>
              <CardHeader className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Fasilitas Umum</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daftar Fasilitas
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {settings.common_amenities.map((amenity, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full"
                        >
                          <span>{amenity}</span>
                          <button
                            onClick={() => setSettings(prev => ({
                              ...prev,
                              common_amenities: prev.common_amenities.filter((_, i) => i !== index)
                            }))}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <input
                        type="text"
                        placeholder="Tambah fasilitas..."
                        className="px-3 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value) {
                              setSettings(prev => ({
                                ...prev,
                                common_amenities: [...prev.common_amenities, value]
                              }));
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Fasilitas
                    </label>
                    <ImageUpload
                      type="common"
                      images={settings.common_amenities_photos}
                      onUpload={(url) => handleAddPhoto(url, 'common')}
                      onDelete={(url) => handleDeletePhoto(url, 'common')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parking Amenities */}
            <Card>
              <CardHeader className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Fasilitas Parkir</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daftar Fasilitas
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {settings.parking_amenities.map((amenity, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full"
                        >
                          <span>{amenity}</span>
                          <button
                            onClick={() => setSettings(prev => ({
                              ...prev,
                              parking_amenities: prev.parking_amenities.filter((_, i) => i !== index)
                            }))}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <input
                        type="text"
                        placeholder="Tambah fasilitas..."
                        className="px-3 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value) {
                              setSettings(prev => ({
                                ...prev,
                                parking_amenities: [...prev.parking_amenities, value]
                              }));
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Fasilitas
                    </label>
                    <ImageUpload
                      type="parking"
                      images={settings.parking_amenities_photos}
                      onUpload={(url) => handleAddPhoto(url, 'parking')}
                      onDelete={(url) => handleDeletePhoto(url, 'parking')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Rules & Preview */}
          <div className="space-y-6">
            {/* House Rules */}
            <Card>
              <CardHeader className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Peraturan Kost</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {settings.rules.map((rule, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full"
                      >
                        <span>{rule}</span>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            rules: prev.rules.filter((_, i) => i !== index)
                          }))}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Tambah peraturan..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value) {
                          setSettings(prev => ({
                            ...prev,
                            rules: [...prev.rules, value]
                          }));
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preview Card */}
            <Card>
              <CardHeader className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Preview</h2>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">
                    Pratinjau tampilan properti Anda di marketplace akan tersedia segera.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-6 right-6">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="shadow-lg"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>

        {showRoomTypeForm && (
          <RoomTypeForm
            roomType={editingRoomType}
            onSubmit={handleRoomTypeSubmit}
            onClose={() => {
              setShowRoomTypeForm(false);
              setEditingRoomType(undefined);
            }}
          />
        )}

        {showAffectedRoomsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <div className="flex items-center gap-2 text-amber-600 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-semibold">Tidak dapat mengubah nama tipe! </h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Tipe ini sedang digunakan di beberapa kamar berikut:
              </p>

              <ul className="mb-4 space-y-2">
                {affectedRooms.map(room => (
                  <li key={room.id} className="flex items-center gap-2 text-gray-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {room.name}
                  </li>
                ))}
              </ul>

              <p className="text-gray-600 mb-4">
                Ubah tipe kamar pada daftar diatas ke tipe lain terlebih dahulu. Kamu baru bisa mengubah nama tipe setelah tidak ada yang terhubung ke tipe kamar ini.
              </p>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowAffectedRoomsModal(false);
                    setPendingRoomTypeUpdate(null);
                    setAffectedRooms([]);
                  }}
                >
                  Batalkan
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeatureGuard>
  );
};

export default MarketplaceSettings;
