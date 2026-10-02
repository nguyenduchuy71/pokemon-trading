-- Local development data only (never run against production).
-- Accounts sign in through the DEV email form: alex|bao|chi|dung|mod @cardswap.dev / cardswap-dev (mod = admin)
-- NOTE: listing "photos" here point at TCGdex reference art so the UI has images without
-- uploading files; real listings require user-uploaded photos in the card-images bucket.

do $$
declare
  v_users jsonb := '[
    {"u":"alexcollector","e":"alex","n":"Alex Nguyen","c":"Ho Chi Minh City","bio":"Chasing 151 SIRs and vintage holos. Meetups in District 1."},
    {"u":"baotrainer","e":"bao","n":"Bảo Trần","c":"Hanoi","bio":"Japanese prints only. Trade binder always open."},
    {"u":"chi_vault","e":"chi","n":"Chi Lê","c":"Da Nang","bio":"Eeveelution completionist."},
    {"u":"dungpulls","e":"dung","n":"Dũng Phạm","c":"Can Tho","bio":"Opening Prismatic Evolutions one booster at a time."},
    {"u":"moderator","e":"mod","n":"CardSwap Team","c":"Ho Chi Minh City","bio":"Community moderation."}
  ]';
  r jsonb;
  v_id uuid;
begin
  for r in select * from jsonb_array_elements(v_users) loop
    v_id := extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'cardswap-dev:' || (r ->> 'u'));
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      (r ->> 'e') || '@cardswap.dev',
      extensions.crypt('cardswap-dev', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', r ->> 'n'),
      now() - interval '200 days', now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', (r ->> 'e') || '@cardswap.dev'), 'email', now(), now(), now());
    update public.profiles
    set username = r ->> 'u', bio = r ->> 'bio', location_city = r ->> 'c', terms_accepted_at = now(),
        created_at = now() - interval '200 days'
    where id = v_id;
  end loop;
  update public.profiles set role = 'ADMIN' where username = 'moderator';
end $$;

-- Helper: add an owned copy (+ reference photo) and optionally list it.
create function pg_temp.seed_copy(
  p_user text, p_set text, p_number text, p_lang text, p_cond public.card_condition,
  p_type public.listing_type, p_price numeric, p_cur public.currency_code, p_desc text, p_looking text[] default '{}'
) returns void language plpgsql as $$
declare v_owner uuid; v_card public.pokemon_cards; v_item uuid;
begin
  select id into v_owner from public.profiles where username = p_user;
  select * into v_card from public.pokemon_cards where set_code = p_set and card_number = p_number and language = p_lang;
  if v_card.id is null then raise notice 'seed: card % % % missing', p_set, p_number, p_lang; return; end if;
  insert into public.collection_items (owner_id, collection_id, card_id, condition, printing, estimated_value, value_currency)
  select v_owner, id, v_card.id, p_cond, v_card.printing[1], p_price, p_cur from public.collections where owner_id = v_owner and is_default
  returning id into v_item;
  insert into public.collection_item_photos (item_id, owner_id, thumb_path, medium_path)
  values (v_item, v_owner, coalesce(v_card.image_small_url, ''), coalesce(v_card.image_large_url, v_card.image_small_url, ''));
  if p_type is not null then
    insert into public.card_listings (item_id, seller_id, card_id, listing_type, price, currency, description, looking_for, created_at)
    values (v_item, v_owner, v_card.id, p_type, p_price, p_cur, p_desc, p_looking, now() - (random() * interval '20 days'));
  end if;
end $$;

select pg_temp.seed_copy('alexcollector', 'sv03.5', '199', 'en', 'NEAR_MINT', 'SALE_OR_TRADE', 185, 'USD', 'Pulled and sleeved immediately. Centering is great — happy to send extra photos.', '{Umbreon VMAX,Pikachu}');
select pg_temp.seed_copy('alexcollector', 'sv03.5', '025', 'en', 'MINT', 'TRADE', null, 'VND', 'Looking for Eeveelutions.', '{Espeon,Umbreon}');
select pg_temp.seed_copy('alexcollector', 'base1', '4', 'en', 'PLAYED', 'SALE', 9500000, 'VND', 'Unlimited Base Set Charizard. Edge wear, no creases.');
select pg_temp.seed_copy('alexcollector', 'swsh7', '215', 'en', 'NEAR_MINT', null, null, 'VND', null);
select pg_temp.seed_copy('baotrainer', 'SV2a', '201', 'ja', 'MINT', 'SALE_OR_TRADE', 3200000, 'VND', 'JP 151 SAR. Gặp trực tiếp ở Hoàn Kiếm.', '{Mew ex SAR}');
select pg_temp.seed_copy('baotrainer', 'SV2a', '205', 'ja', 'NEAR_MINT', 'SALE', 2900000, 'VND', 'Mew ex SAR.');
select pg_temp.seed_copy('baotrainer', 'SV8a', '211', 'ja', 'EXCELLENT', 'TRADE', null, 'VND', 'エーフィex (Espeon ex) JP — trade only.', '{Umbreon VMAX alt}');
select pg_temp.seed_copy('chi_vault', 'swsh7', '215', 'en', 'NEAR_MINT', 'SALE', 1100, 'USD', 'Moonbreon. Grading candidate.');
select pg_temp.seed_copy('chi_vault', 'sv08.5', '161', 'en', 'MINT', 'SALE', 420, 'USD', 'Fresh from the pack.');
select pg_temp.seed_copy('chi_vault', 'sv08.5', '155', 'en', 'NEAR_MINT', 'SALE_OR_TRADE', 4800000, 'VND', null, '{Umbreon ex SIR}');
select pg_temp.seed_copy('dungpulls', 'sv08.5', '156', 'en', 'NEAR_MINT', 'SALE', 2300000, 'VND', 'Sylveon ex SIR.');
select pg_temp.seed_copy('dungpulls', 'SV8a', '217', 'ja', 'MINT', 'SALE', 6500000, 'VND', null);
select pg_temp.seed_copy('dungpulls', 'sv03.5', '151', 'en', 'NEAR_MINT', 'TRADE', null, 'VND', 'Mew ex for trade.', '{Charizard ex}');

-- A binder and wishlist entries.
insert into public.collections (owner_id, name, description, position)
select id, 'Trade Binder', 'Everything here is up for trade.', 1 from public.profiles where username = 'alexcollector';

insert into public.wishlist_items (wishlist_id, owner_id, card_id, max_price, max_price_currency, min_condition, priority)
select w.id, w.owner_id, c.id, 30000000, 'VND', 'NEAR_MINT', 'HIGH'
from public.wishlists w join public.profiles p on p.id = w.owner_id
join public.pokemon_cards c on c.set_code = 'swsh7' and c.card_number = '215' and c.language = 'en'
where p.username = 'alexcollector';

insert into public.wishlist_items (wishlist_id, owner_id, card_id, max_price, max_price_currency, min_condition, priority)
select w.id, w.owner_id, c.id, 200, 'USD', 'NEAR_MINT', 'MEDIUM'
from public.wishlists w join public.profiles p on p.id = w.owner_id
join public.pokemon_cards c on c.set_code = 'sv03.5' and c.card_number = '199' and c.language = 'en'
where p.username = 'dungpulls';

-- A conversation started from a listing (as baotrainer → alexcollector).
do $$
declare v_alex uuid; v_bao uuid; v_listing uuid; v_conv uuid;
begin
  select id into v_alex from public.profiles where username = 'alexcollector';
  select id into v_bao from public.profiles where username = 'baotrainer';
  select l.id into v_listing from public.card_listings l join public.pokemon_cards c on c.id = l.card_id
  where l.seller_id = v_alex and c.card_number = '199' and c.set_code = 'sv03.5';
  insert into public.conversations (created_by, listing_id, created_at, last_message_at) values (v_bao, v_listing, now() - interval '2 hours', now() - interval '2 hours') returning id into v_conv;
  insert into public.conversation_members (conversation_id, user_id, joined_at) values (v_conv, v_bao, now() - interval '2 hours'), (v_conv, v_alex, now() - interval '2 hours');
  insert into public.messages (conversation_id, sender_id, kind, listing_id, created_at) values (v_conv, v_bao, 'LISTING', v_listing, now() - interval '2 hours');
  insert into public.messages (conversation_id, sender_id, body, created_at) values
    (v_conv, v_bao, 'Hi! Is your Charizard still available?', now() - interval '119 minutes'),
    (v_conv, v_alex, 'Yes, it is. Are you interested in buying or trading?', now() - interval '110 minutes'),
    (v_conv, v_bao, 'I could trade my JP Charizard SAR for it — would you add anything?', now() - interval '100 minutes');
  update public.card_listings set conversation_count = 1 where id = v_listing;
end $$;
