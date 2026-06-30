'use client'

import { PublicStorefrontDTO } from '@/lib/domains/public/types'
import { motion } from 'framer-motion'
import { ArrowRight, Camera, MapPin, Mail, Phone, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function StorefrontView({ storefront }: { storefront: PublicStorefrontDTO }) {
  const { name, bio, cover_url, logo_url, slug, packages, team, portfolio, address, email, phone } = storefront

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  }
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 100 } }
  }

  return (
    <div className="w-full relative min-h-screen pb-24 animate-enter">
      {/* Dynamic Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[var(--background)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[var(--primary)]/10 via-transparent to-transparent opacity-50" />
        <div className="absolute top-1/4 -right-1/4 w-[50vw] h-[50vw] bg-[var(--primary)]/10 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-0 -left-1/4 w-[60vw] h-[60vw] bg-[var(--primary)]/5 rounded-full blur-[150px] mix-blend-screen opacity-50" />
      </div>

      {/* Hero Section */}
      <section className="relative w-full h-[75vh] min-h-[600px] flex flex-col items-center justify-center overflow-hidden border-b border-[var(--border)]">
        {cover_url && (
          <div className="absolute inset-0 z-0">
            <Image 
              src={cover_url} 
              alt={`${name} Cover`} 
              fill 
              className="object-cover opacity-40 scale-105 animate-[pulse_10s_ease-in-out_infinite_alternate]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/30 to-transparent" />
          </div>
        )}

        <motion.div 
          className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-[var(--primary)]/20 blur-3xl rounded-full scale-150" />
            {logo_url ? (
              <motion.img 
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                src={logo_url} 
                alt={name || 'Studio Logo'} 
                className="relative w-28 h-28 rounded-full border-2 border-[var(--border)] shadow-2xl object-cover bg-[var(--background)] z-10"
              />
            ) : (
              <div className="relative w-28 h-28 rounded-full bg-[var(--card)] text-[var(--primary)] flex items-center justify-center text-4xl font-bold shadow-2xl border-2 border-[var(--border)] z-10">
                <Camera size={48} strokeWidth={1.5} />
              </div>
            )}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-[var(--foreground)] drop-shadow-sm">
            {name}
          </h1>
          
          {bio && (
            <p className="text-xl md:text-2xl text-[var(--muted-foreground)] mb-12 max-w-2xl leading-relaxed font-medium">
              {bio}
            </p>
          )}

          <Link href={`/${slug}/book`}>
            <button className="group relative px-8 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] text-lg font-bold rounded-2xl overflow-hidden shadow-xl shadow-[var(--primary)]/25 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-[var(--primary)]/40 active:scale-95">
              <div className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              <span className="flex items-center gap-3">
                Book a Session <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300" strokeWidth={2.5} />
              </span>
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Main Content Wrapper */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 mt-24 space-y-32">
        
        {/* Packages Section */}
        {packages && packages.length > 0 && (
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            id="packages"
          >
            <div className="flex flex-col items-center text-center mb-16">
              <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-[0.2em] mb-4">Pricing</span>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-[var(--foreground)] tracking-tight">Our Experiences</h2>
              <p className="text-[var(--muted-foreground)] text-lg max-w-xl">Curated collections designed to perfectly capture your story.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((pkg) => (
                <motion.div 
                  key={pkg.package_id}
                  variants={itemVariants}
                  className="glass-panel group flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--primary)]/10"
                >
                  <div className="relative h-64 w-full bg-[var(--card-hover)] overflow-hidden">
                    <div className="absolute inset-0 bg-[var(--primary)]/5 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none" />
                    {pkg.cover_url ? (
                      <Image 
                        src={pkg.cover_url} 
                        alt={pkg.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="text-[var(--primary)]/20 w-16 h-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                    
                    <div className="absolute top-4 right-4 bg-[var(--background)]/80 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-[var(--border)] z-20 text-[var(--foreground)] group-hover:border-[var(--primary)]/30 transition-colors">
                      ${pkg.base_price}
                    </div>
                  </div>
                  
                  <div className="flex flex-col flex-1 p-8 relative z-20 bg-[var(--background)]/40 backdrop-blur-sm -mt-4 rounded-t-3xl border-t border-[var(--border)] group-hover:border-[var(--primary)]/20 transition-colors">
                    <h3 className="text-2xl font-bold mb-3 text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{pkg.name}</h3>
                    {pkg.description && (
                      <p className="text-[var(--muted-foreground)] mb-8 line-clamp-3 leading-relaxed text-sm">
                        {pkg.description}
                      </p>
                    )}
                    
                    <div className="mt-auto pt-6 border-t border-[var(--border)]">
                      <Link href={`/${slug}/book?package=${pkg.package_id}`} className="w-full inline-flex items-center justify-center py-4 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] font-bold rounded-xl transition-all shadow-sm group-hover:shadow-md">
                        Select Package
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Portfolio Section */}
        {portfolio && portfolio.length > 0 && (
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="flex flex-col items-center text-center mb-16">
              <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-[0.2em] mb-4">Portfolio</span>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-[var(--foreground)] tracking-tight">Featured Work</h2>
              <p className="text-[var(--muted-foreground)] text-lg max-w-xl">A glimpse into the moments we've immortalized.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[250px]">
              {portfolio.slice(0, 8).map((gallery, i) => (
                <motion.a
                  key={gallery.gallery_id}
                  href={`/${slug}/gallery/${gallery.shared_link}`}
                  variants={itemVariants}
                  className={`group relative rounded-3xl overflow-hidden block ${i === 0 || i === 3 ? 'col-span-2 row-span-2' : ''} shadow-lg hover:shadow-2xl hover:shadow-[var(--primary)]/20 transition-all duration-500`}
                >
                  <div className="absolute inset-0 bg-[var(--card)]">
                    {gallery.cover_photo_url ? (
                      <Image 
                        src={gallery.cover_photo_url} 
                        alt={gallery.title || 'Gallery'} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]/5">
                        <Camera className="text-[var(--primary)]/20 w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)]/90 via-[var(--background)]/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-8 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <h4 className="text-[var(--foreground)] font-bold text-2xl tracking-tight mb-2">{gallery.title}</h4>
                    <p className="text-[var(--primary)] text-sm font-semibold flex items-center gap-2">
                      View Gallery <ExternalLink size={16} className="group-hover:translate-x-1 transition-transform" />
                    </p>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.section>
        )}

        {/* Team Section */}
        {team && team.length > 0 && (
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="glass-panel relative rounded-[3rem] p-12 md:p-24 text-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[var(--primary)]/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[var(--primary)]/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10">
              <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-[0.2em] mb-4 block">Creatives</span>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-[var(--foreground)] tracking-tight">Meet the Team</h2>
              <p className="text-[var(--muted-foreground)] text-lg max-w-xl mx-auto mb-16">The creatives behind the lens bringing your vision to life.</p>
              
              <div className="flex flex-wrap justify-center gap-16">
                {team.map((member) => (
                  <motion.div key={member.staff_id} variants={itemVariants} className="flex flex-col items-center max-w-[250px] group">
                    <div className="w-48 h-48 rounded-full overflow-hidden mb-8 shadow-2xl relative bg-[var(--card)] group-hover:-translate-y-2 group-hover:shadow-[var(--primary)]/30 transition-all duration-500">
                      <div className="absolute inset-0 rounded-full border-4 border-[var(--background)] z-20 pointer-events-none" />
                      {member.avatar_url ? (
                        <Image src={member.avatar_url} alt={member.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-10" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl font-black text-[var(--primary)]/30 z-10">
                          {member.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{member.name}</h3>
                    {member.bio && (
                      <p className="text-[var(--muted-foreground)] text-sm leading-relaxed font-medium">{member.bio}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Footer/Contact */}
        <footer className="relative z-10 border-t border-[var(--border)] pt-16 mt-32 flex flex-col md:flex-row justify-between items-center gap-8 text-[var(--foreground)]">
          <div className="flex items-center gap-4 group cursor-pointer">
            {logo_url ? (
              <img src={logo_url} alt="Logo" className="w-14 h-14 rounded-full object-cover border border-[var(--border)] shadow-sm group-hover:scale-110 transition-transform duration-500" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-bold text-xl shadow-sm group-hover:scale-110 transition-transform duration-500">
                {name?.charAt(0) || 'S'}
              </div>
            )}
            <div>
              <h4 className="font-bold text-xl tracking-tight group-hover:text-[var(--primary)] transition-colors">{name}</h4>
              <p className="text-[var(--muted-foreground)] text-sm font-medium">Capturing life's moments.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-[var(--muted-foreground)] font-medium">
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-[var(--foreground)] hover:scale-105 transition-all">
                <Mail size={18} className="text-[var(--primary)]" /> {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-[var(--foreground)] hover:scale-105 transition-all">
                <Phone size={18} className="text-[var(--primary)]" /> {phone}
              </a>
            )}
            {address && (
              <span className="flex items-center gap-2">
                <MapPin size={18} className="text-[var(--primary)]" /> {address}
              </span>
            )}
          </div>
        </footer>
      </main>
    </div>
  )
}
