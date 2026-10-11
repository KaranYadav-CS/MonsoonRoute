-- Transactional negative smoke; expected functions to throw, rollback-only.
begin;
do $$ begin
  begin perform public.live_route_context(gen_random_uuid()); raise exception 'EXPECTED_GRAPH_VERSION_MISMATCH_NOT_RAISED';
  exception when others then
    if sqlerrm <> 'GRAPH_VERSION_MISMATCH' then raise; end if;
  end;
  begin perform public.pin_vision_source(gen_random_uuid(),gen_random_uuid(),'bad'); raise exception 'EXPECTED_INVALID_SOURCE_HASH_NOT_RAISED';
  exception when others then
    if sqlerrm <> 'INVALID_SOURCE_HASH' then raise; end if;
  end;
end $$;
rollback;
