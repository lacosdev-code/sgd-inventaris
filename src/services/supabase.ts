import { createClient } from '@supabase/supabase-js';
import { InventoryItem, PersonnelItem, BorrowingRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- HARDCODED INITIAL DATA (Sheet 1: 16 Barang) ---
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Laptop Dell Latitude', category: 'Elektronik', location: 'Kantor Utama', quantity: 10, condition: 'Baik', price: 15000000, image_url: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6' },
  { id: '2', name: 'Proyektor Epson', category: 'Elektronik', location: 'Ruang Meeting', quantity: 3, condition: 'Baik', price: 8000000, image_url: 'https://images.unsplash.com/photo-1517502884422-41e157d4433f' },
  { id: '3', name: 'Kabel HDMI 5m', category: 'Aksesoris', location: 'Gudang', quantity: 20, condition: 'Baik', price: 150000, image_url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d' },
  { id: '4', name: 'Kursi Ergonomis', category: 'Furniture', location: 'Kantor Utama', quantity: 50, condition: 'Baik', price: 2500000, image_url: 'https://images.unsplash.com/photo-1592078615290-033ee584e267' },
  { id: '5', name: 'Meja Kerja', category: 'Furniture', location: 'Kantor Utama', quantity: 25, condition: 'Baik', price: 3000000, image_url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd' },
  { id: '6', name: 'Printer HP LaserJet', category: 'Elektronik', location: 'Admin', quantity: 2, condition: 'Perlu Perbaikan', price: 4000000, image_url: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6' },
  { id: '7', name: 'Scanner Canon', category: 'Elektronik', location: 'Admin', quantity: 1, condition: 'Baik', price: 2000000, image_url: 'https://images.unsplash.com/photo-1588619461336-d76077b9d3e4' },
  { id: '8', name: 'Whiteboard Besar', category: 'Alat Tulis', location: 'Ruang Meeting', quantity: 2, condition: 'Baik', price: 1000000, image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12' },
  { id: '9', name: 'Spidol Boardmarker', category: 'Alat Tulis', location: 'Gudang', quantity: 100, condition: 'Baik', price: 15000, image_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338' },
  { id: '10', name: 'Penghapus Papan', category: 'Alat Tulis', location: 'Ruang Meeting', quantity: 5, condition: 'Rusak', price: 10000, image_url: 'https://images.unsplash.com/photo-1598528654926-d3440787e22b' },
  { id: '11', name: 'AC Daikin 1PK', category: 'Elektronik', location: 'Kantor Utama', quantity: 8, condition: 'Baik', price: 4500000, image_url: 'https://images.unsplash.com/photo-1620603775080-6060c5c4e97f' },
  { id: '12', name: 'Remote AC', category: 'Aksesoris', location: 'Admin', quantity: 8, condition: 'Baik', price: 150000, image_url: 'https://images.unsplash.com/photo-1559677335-5b430e37602e' },
  { id: '13', name: 'Dispenser Galon Bawah', category: 'Pantry', location: 'Pantry', quantity: 2, condition: 'Baik', price: 2000000, image_url: 'https://images.unsplash.com/photo-1522008629173-e1114618ec6a' },
  { id: '14', name: 'Galon Aqua', category: 'Pantry', location: 'Gudang', quantity: 10, condition: 'Baik', price: 50000, image_url: 'https://images.unsplash.com/photo-1603507119139-4971c08e5473' },
  { id: '15', name: 'Gelas Kaca', category: 'Pantry', location: 'Pantry', quantity: 50, condition: 'Baik', price: 25000, image_url: 'https://images.unsplash.com/photo-1571506538622-d3cf48d08c5d' },
  { id: '16', name: 'Piring Keramik', category: 'Pantry', location: 'Pantry', quantity: 50, condition: 'Baik', price: 30000, image_url: 'https://images.unsplash.com/photo-1603195861963-446757656606' },
];

// --- HARDCODED INITIAL DATA (Sheet 2: 26 Orang) ---
const INITIAL_PERSONNEL: PersonnelItem[] = [
  { id: 'p1', person_name: 'Galih', item_name: 'Laptop Dell Latitude', quantity: 1, condition: 'Baik' },
  { id: 'p2', person_name: 'Eko', item_name: 'Laptop Dell Latitude', quantity: 1, condition: 'Baik' },
  { id: 'p3', person_name: 'Agus', item_name: 'Kabel HDMI 5m', quantity: 2, condition: 'Baik' },
  { id: 'p4', person_name: 'Bokir', item_name: 'Kursi Ergonomis', quantity: 1, condition: 'Rusak' },
  { id: 'p5', person_name: 'Siti', item_name: 'Printer HP LaserJet', quantity: 1, condition: 'Baik' },
  { id: 'p6', person_name: 'Budi', item_name: 'Meja Kerja', quantity: 1, condition: 'Baik' },
  { id: 'p7', person_name: 'Ani', item_name: 'Kursi Ergonomis', quantity: 1, condition: 'Baik' },
  { id: 'p8', person_name: 'Doni', item_name: 'AC Daikin 1PK', quantity: 1, condition: 'Perlu Perbaikan' },
  { id: 'p9', person_name: 'Rina', item_name: 'Scanner Canon', quantity: 1, condition: 'Baik' },
  { id: 'p10', person_name: 'Joko', item_name: 'Laptop Dell Latitude', quantity: 1, condition: 'Baik' },
  { id: 'p11', person_name: 'Tono', item_name: 'Spidol Boardmarker', quantity: 5, condition: 'Baik' },
  { id: 'p12', person_name: 'Lisa', item_name: 'Kursi Ergonomis', quantity: 1, condition: 'Baik' },
  { id: 'p13', person_name: 'Rudi', item_name: 'Meja Kerja', quantity: 1, condition: 'Baik' },
  { id: 'p14', person_name: 'Maya', item_name: 'Laptop Dell Latitude', quantity: 1, condition: 'Rusak' },
  { id: 'p15', person_name: 'Bayu', item_name: 'Proyektor Epson', quantity: 1, condition: 'Baik' },
  { id: 'p16', person_name: 'Dewi', item_name: 'Gelas Kaca', quantity: 6, condition: 'Baik' },
  { id: 'p17', person_name: 'Putra', item_name: 'Piring Keramik', quantity: 6, condition: 'Baik' },
  { id: 'p18', person_name: 'Putri', item_name: 'Kursi Ergonomis', quantity: 1, condition: 'Baik' },
  { id: 'p19', person_name: 'Dian', item_name: 'Meja Kerja', quantity: 1, condition: 'Baik' },
  { id: 'p20', person_name: 'Rizky', item_name: 'Kabel HDMI 5m', quantity: 3, condition: 'Baik' },
  { id: 'p21', person_name: 'Fajar', item_name: 'Remote AC', quantity: 1, condition: 'Baik' },
  { id: 'p22', person_name: 'Nur', item_name: 'Whiteboard Besar', quantity: 1, condition: 'Baik' },
  { id: 'p23', person_name: 'Sari', item_name: 'Dispenser Galon', quantity: 1, condition: 'Baik' },
  { id: 'p24', person_name: 'Hendi', item_name: 'Galon Aqua', quantity: 2, condition: 'Baik' },
  { id: 'p25', person_name: 'Yanto', item_name: 'Kursi Ergonomis', quantity: 1, condition: 'Perlu Perbaikan' },
  { id: 'p26', person_name: 'Wawan', item_name: 'Meja Kerja', quantity: 1, condition: 'Baik' },
];

// --- LOCAL STORAGE HELPERS (Fallback System) ---
const getLocal = (key: string) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const setLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize Local Data if Empty
if (!getLocal('inventory')) setLocal('inventory', INITIAL_INVENTORY);
if (!getLocal('personnel')) setLocal('personnel', INITIAL_PERSONNEL);
if (!getLocal('borrowings')) setLocal('borrowings', []);

// --- INVENTORY SERVICES ---

export const getInventory = async (): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
    if (error || !data) throw new Error('Supabase fetch failed');
    return data;
  } catch (e) {
    // Fallback to Local Storage
    return getLocal('inventory') || [];
  }
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
  const newItem = { ...item, id: uuidv4(), created_at: new Date().toISOString() };
  try {
    const { error } = await supabase.from('inventory').insert([newItem]);
    if (error) throw error;
  } catch (e) {
    const current = getLocal('inventory');
    setLocal('inventory', [newItem, ...current]);
  }
  return newItem;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
  try {
    const { error } = await supabase.from('inventory').update(updates).eq('id', id);
    if (error) throw error;
  } catch (e) {
    const current = getLocal('inventory');
    const updated = current.map((i: InventoryItem) => i.id === id ? { ...i, ...updates } : i);
    setLocal('inventory', updated);
  }
};

export const deleteInventoryItem = async (id: string) => {
  try {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    const current = getLocal('inventory');
    const filtered = current.filter((i: InventoryItem) => i.id !== id);
    setLocal('inventory', filtered);
  }
};

// --- PERSONNEL SERVICES ---

export const getPersonnelInventory = async (): Promise<PersonnelItem[]> => {
  try {
    const { data, error } = await supabase.from('personnel_inventory').select('*');
    if (error || !data) throw new Error('Supabase fetch failed');
    return data;
  } catch (e) {
    return getLocal('personnel') || [];
  }
};

// --- BORROWING SERVICES (With Transaction Logic) ---

export const getBorrowings = async (): Promise<BorrowingRecord[]> => {
  try {
    const { data, error } = await supabase.from('borrowings').select('*');
    if (error || !data) throw new Error('Supabase fetch failed');
    return data;
  } catch (e) {
    return getLocal('borrowings') || [];
  }
};

export const addBorrowing = async (record: Omit<BorrowingRecord, 'id'>, currentStock: number) => {
  const newRecord = { ...record, id: uuidv4() };

  try {
    // Attempt Supabase Transaction (Sequential)
    const { error: updateError } = await supabase
      .from('inventory')
      .update({ quantity: currentStock - record.quantity })
      .eq('id', record.item_id);

    if (updateError) throw updateError;

    const { error: insertError } = await supabase
      .from('borrowings')
      .insert([newRecord]);

    if (insertError) {
      // Rollback
      await supabase
        .from('inventory')
        .update({ quantity: currentStock })
        .eq('id', record.item_id);
      throw insertError;
    }

  } catch (e) {
    console.warn("Using local storage fallback for transaction");
    const inv = getLocal('inventory');
    const itemIndex = inv.findIndex((i: InventoryItem) => i.id === record.item_id);

    if (itemIndex > -1) {
      if (inv[itemIndex].quantity < record.quantity) throw new Error("Stok tidak cukup");
      inv[itemIndex].quantity -= record.quantity;
      setLocal('inventory', inv);
      const borrows = getLocal('borrowings');
      setLocal('borrowings', [newRecord, ...borrows]);
    } else {
      throw new Error("Item not found");
    }
  }
  return newRecord;
};

export const returnBorrowing = async (record: BorrowingRecord, currentStock: number) => {
  const updates = { status: 'Kembali', returned_date: new Date().toISOString() };
  try {
    const { error: updateBorrowError } = await supabase
      .from('borrowings')
      .update(updates)
      .eq('id', record.id);
    if (updateBorrowError) throw updateBorrowError;

    const { error: updateStockError } = await supabase
      .from('inventory')
      .update({ quantity: currentStock + record.quantity })
      .eq('id', record.item_id);
    if (updateStockError) console.error("Stock update failed");
  } catch (e) {
    const borrows = getLocal('borrowings');
    const updatedBorrows = borrows.map((b: BorrowingRecord) => b.id === record.id ? { ...b, ...updates } : b);
    setLocal('borrowings', updatedBorrows);
    const inv = getLocal('inventory');
    const itemIndex = inv.findIndex((i: InventoryItem) => i.id === record.item_id);
    if (itemIndex > -1) {
      inv[itemIndex].quantity += record.quantity;
      setLocal('inventory', inv);
    }
  }
};

// --- SEED DATABASE ---
export const seedDatabase = async () => {
  try {
    const { count } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
    if (count === 0) {
      console.log('Seeding initial data...');
      await supabase.from('inventory').insert(INITIAL_INVENTORY);
      await supabase.from('personnel_inventory').insert(INITIAL_PERSONNEL);
    }
  } catch (err) {
    console.warn('Seeding skipped or already done');
  }
};