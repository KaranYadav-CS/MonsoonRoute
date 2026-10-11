import AuthShowcase from '@/components/AuthShowcase';
export default async function Login({searchParams}:{searchParams:Promise<{next?:string}>}){const p=await searchParams;return <AuthShowcase mode="login" next={p.next}/>}
