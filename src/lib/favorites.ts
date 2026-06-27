import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type FavTarget = "store" | "product";

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("*");
      return data ?? [];
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return async (targetType: FavTarget, targetId: string, isFav: boolean) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (isFav) {
      await supabase.from("favorites").delete()
        .eq("user_id", u.user.id).eq("target_type", targetType).eq("target_id", targetId);
    } else {
      await supabase.from("favorites").insert({
        user_id: u.user.id, target_type: targetType, target_id: targetId,
      });
    }
    qc.invalidateQueries({ queryKey: ["favorites"] });
  };
}
