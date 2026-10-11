-- Read-only live assertions; any false value signals failure.
select
 (select count(*)=18 from information_schema.tables where table_schema='public' and table_type='BASE TABLE') as exactly_18_public_tables,
 (select count(*)=0 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity) as all_public_tables_rls,
 (select count(*)=0 from pg_proc x join pg_namespace n on n.oid=x.pronamespace where n.nspname='public' and x.proname in ('consume_quota','claim_vision_job','finish_vision_job','moderate_report','publish_weather_run','create_report_draft','finalize_report','backend_context','set_runtime_flags','withdraw_report','live_route_context','reserve_vision_enqueue','retry_vision_job','maintenance_context','commit_audit_archive','prune_maintenance','expire_report_source','pin_vision_source') and (has_function_privilege('anon',x.oid,'execute') or has_function_privilege('authenticated',x.oid,'execute'))) as rpc_exposure_zero,
 (select count(*)=0 from pg_policies where schemaname='storage' and tablename='objects' and cmd in ('UPDATE','DELETE') and policyname like 'report_photo%') as no_client_photo_mutations,
 (select count(*)=1 from storage.buckets where id='report-photos' and public=false and file_size_limit=3145728) as photo_bucket_private;
