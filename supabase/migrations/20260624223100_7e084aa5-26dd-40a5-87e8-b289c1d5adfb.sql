
-- Allow merchant (store owner) to insert orders for their store regardless of customer_id
CREATE POLICY "merchant creates store order"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.owner_id = auth.uid())
);

-- Ensure order_items insert works for merchant too
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid='public.order_items'::regclass AND polname='merchant inserts order items'
  ) THEN
    CREATE POLICY "merchant inserts order items"
      ON public.order_items FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.orders o
          JOIN public.stores s ON s.id = o.store_id
          WHERE o.id = order_items.order_id AND s.owner_id = auth.uid()
        )
      );
  END IF;
END $$;
