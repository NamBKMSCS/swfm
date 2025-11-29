-- Create user status enum
CREATE TYPE "public"."user_status" AS ENUM ('pending', 'active', 'rejected');

-- Add status column to users table
ALTER TABLE "public"."users" 
ADD COLUMN "status" "public"."user_status" NOT NULL DEFAULT 'pending';

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  declare
    user_count int;
    requested_role public.app_role;
  begin
    -- Count existing users to determine if this is the first user
    select count(*) from public.users into user_count;

    -- Insert into public.users
    insert into public.users (id, email, full_name, status)
    values (
      new.id, 
      new.email, 
      new.raw_user_meta_data->>'full_name',
      case 
        when user_count = 0 then 'active'::public.user_status
        else 'pending'::public.user_status
      end
    );

    -- Determine role
    if user_count = 0 then
      -- First user is always admin
      insert into public.user_roles (user_id, role) values (new.id, 'admin');
    else
      -- Subsequent users get role from metadata (default to data_scientist if missing)
      -- We trust the metadata here because the status is pending anyway
      requested_role := coalesce(
        (new.raw_user_meta_data->>'role')::public.app_role, 
        'data_scientist'::public.app_role
      );
      
      -- Prevent non-first users from becoming admins via metadata hacking (optional but good practice)
      -- If they request admin, we can either allow it (pending approval) or force data_scientist.
      -- The requirement says "The sign up should only create a pending account where admin need to approve".
      -- It implies they CAN request admin. So we allow it.
      insert into public.user_roles (user_id, role) values (new.id, requested_role);
    end if;

    return new;
  end;
$$;
