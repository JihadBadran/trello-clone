-- 1. Make owner_id nullable
ALTER TABLE public.boards ALTER COLUMN owner_id DROP NOT NULL;

-- 2. Create the trigger function to set owner_id from auth.uid()
CREATE OR REPLACE FUNCTION public.set_board_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.owner_id := auth.uid();
  RETURN NEW;
END;
$$;

-- 3. Create the trigger to fire before insert
CREATE TRIGGER on_board_created
  BEFORE INSERT ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION public.set_board_owner();

-- 4. Remove the old trigger that added owner to board_members, as it's no longer needed
-- The new trigger on board_members table will handle this
DROP TRIGGER IF EXISTS tg_boards_owner_membership ON public.boards;
DROP FUNCTION IF EXISTS public.add_owner_membership();

-- 5. Add a new trigger on board_members to ensure the board owner is always a member
CREATE OR REPLACE FUNCTION public.ensure_owner_is_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- When a board is created, its owner_id is set by a trigger.
  -- This trigger ensures that whenever a board is created, the owner is also added as a member.
  INSERT INTO public.board_members(board_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (board_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_board_created_add_member
  AFTER INSERT ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_owner_is_member();
