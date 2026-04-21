import './globals.css'
import { Inter } from 'next/font/google'
import { SupabaseProvider } from '@/lib/useSupabase'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'StoryLoom - AI-Powered Children\'s Storybook Generator',
    description: 'Create magical personalized children\'s stories with AI-generated text and beautiful illustrations.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <SupabaseProvider>
                    {children}
                </SupabaseProvider>
            </body>
        </html>
    )
}
