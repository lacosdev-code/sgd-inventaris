export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    condition: string;
    price: number;
    image_url?: string;
    created_at?: string;
}

export interface PersonnelItem {
    id: string;
    person_name: string;
    item_name: string;
    quantity: number;
    condition: string;
}

export interface BorrowingRecord {
    id: string;
    item_id: string;
    item_name: string;
    person_name: string;
    quantity: number;
    status: 'Dipinjam' | 'Kembali';
    borrowed_date: string;
    returned_date?: string;
    notes?: string;
}
