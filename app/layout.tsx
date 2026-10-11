import type {Metadata} from 'next';
import './globals.css';
import './design-system.css';
import AppChrome from '@/components/AppChrome';
export const metadata:Metadata={title:'MonsoonRoute — Evidence-aware journeys',description:'Central Delhi waterlogging route decision aid: relative risk and reviewable evidence, not road safety certification.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AppChrome>{children}</AppChrome></body></html>}
