import AuthShowcase from '@/components/AuthShowcase';
export default async function Signup({searchParams}:{searchParams:Promise<{next?:string}>}){const p=await searchParams;return <AuthShowcase mode="signup" next={p.next}/>}
