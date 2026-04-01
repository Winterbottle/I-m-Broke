'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DealForm from '../../DealForm';

export default function EditDealPage({ params }: { params: { id: string } }) {
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await window.fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/deals?limit=1`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      // Fetch single deal from public endpoint
      const res2 = await window.fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/deals/${params.id}`);
      if (res2.ok) setDeal(await res2.json());
      setLoading(false);
    };
    fetch();
  }, [params.id]);

  if (loading) return <div className="p-8"><div className="bg-white rounded-xl h-96 animate-pulse border border-brand-border" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Edit Deal</h1>
      <DealForm initial={deal} dealId={params.id} />
    </div>
  );
}
