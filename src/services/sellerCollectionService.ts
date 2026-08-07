import { supabase, getCurrentUserEmail } from '../config/supabase';

export interface SellerCollection {
  id: string;
  seller: string;
  amount: number;
  notes: string | null;
  collected_by: string | null;
  created_at: string;
}

export const sellerCollectionService = {
  async list(): Promise<SellerCollection[]> {
    const { data, error } = await supabase
      .from('seller_collections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('list seller_collections error:', error);
      return [];
    }
    return (data ?? []) as SellerCollection[];
  },

  async create(
    seller: string,
    amount: number,
    notes?: string
  ): Promise<SellerCollection> {
    const { data, error } = await supabase
      .from('seller_collections')
      .insert({
        seller: seller.trim().toLowerCase(),
        amount,
        notes: notes?.trim() || null,
        collected_by: getCurrentUserEmail(),
      })
      .select()
      .single();
    if (error) {
      console.error('create seller_collection error:', error);
      throw error;
    }
    return data as SellerCollection;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('seller_collections')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('delete seller_collection error:', error);
      throw error;
    }
    return true;
  },
};
