import { getStudioContext, fetchStudio } from '@/lib/studio'
import { redirect } from 'next/navigation'
import { Link2, ExternalLink, CalendarHeart, Image as ImageIcon, LayoutTemplate } from 'lucide-react'
import { CopyButton } from './copy-button'

export const metadata = { title: 'Public Links | Weave' }

function LinkCard({ title, description, url, icon: Icon, isPrimary = false }: { title: string, description: string, url: string, icon: any, isPrimary?: boolean }) {
  return (
    <div className={`glass-panel p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isPrimary ? 'border-[var(--primary)]/30' : ''}`}>
      {isPrimary && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 blur-3xl pointer-events-none" />
      )}
      
      <div className={`p-4 rounded-xl ${isPrimary ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-muted text-muted-foreground'}`}>
        <Icon size={28} strokeWidth={1.5} />
      </div>
      
      <div className="flex-1 min-w-0 w-full">
        <h3 className="text-xl font-bold mb-1 text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        
        <div className="flex items-center gap-2 w-full max-w-full">
          <code className="flex-1 bg-muted/50 px-3 py-2 rounded-lg text-sm text-foreground overflow-hidden text-ellipsis whitespace-nowrap border border-border">
            {url}
          </code>
          <CopyButton text={url} />
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2 hover:bg-muted rounded-lg transition-colors text-[var(--primary)] hover:text-[var(--primary)]"
            title="Open link"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default async function PublicLinksPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)
  if (!studio) redirect('/onboarding')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://photostudio-saas.vercel.app'
  const storefrontUrl = `${baseUrl}/${studio.slug}`
  const bookingUrl = `${baseUrl}/${studio.slug}/book`
  const packagesUrl = `${baseUrl}/${studio.slug}#packages`
  const portfolioUrl = `${baseUrl}/${studio.slug}#portfolio`

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Public Links Hub</h1>
        <p className="text-muted-foreground">All the links you need to share your studio with the world.</p>
      </div>

      <div className="flex flex-col gap-6">
        <LinkCard 
          title="Main Storefront" 
          description="Your complete public website. Share this everywhere."
          url={storefrontUrl}
          icon={LayoutTemplate}
          isPrimary={true}
        />

        <LinkCard 
          title="Direct Booking Flow" 
          description="Send clients directly to your booking form to select packages and dates."
          url={bookingUrl}
          icon={CalendarHeart}
        />

        <LinkCard 
          title="Packages Section" 
          description="Jump straight to your pricing and packages on the storefront."
          url={packagesUrl}
          icon={Link2}
        />
        
        <LinkCard 
          title="Portfolio Section" 
          description="Jump straight to your featured work."
          url={portfolioUrl}
          icon={ImageIcon}
        />
      </div>
      
      <div className="mt-12 p-6 glass-panel rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
        <h3 className="font-semibold text-lg mb-2 text-foreground">Pro Tip for Quick Sharing</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You can also use the <strong>Quick Share</strong> hub in the bottom left of your sidebar to instantly generate WhatsApp messages with these links pre-filled!
        </p>
      </div>
    </div>
  )
}
