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
    <div className="w-full relative min-h-screen pb-24">
      {/* Dynamic Background Gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none" />

      {/* Hero Section */}
      <section className="relative w-full h-[60vh] min-h-[500px] flex flex-col items-center justify-center overflow-hidden">
        {cover_url && (
          <div className="absolute inset-0 z-0">
            <Image 
              src={cover_url} 
              alt={`${name} Cover`} 
              fill 
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}

        <motion.div 
          className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {logo_url ? (
            <motion.img 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src={logo_url} 
              alt={name || 'Studio Logo'} 
              className="w-24 h-24 rounded-full mb-6 border-4 border-background shadow-xl object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mb-6 bg-primary/20 text-primary flex items-center justify-center text-3xl font-bold shadow-xl border-4 border-background backdrop-blur-md">
              <Camera size={40} />
            </div>
          )}
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-foreground">
            {name}
          </h1>
          
          {bio && (
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
              {bio}
            </p>
          )}

          <Link href={`/${slug}/book`}>
            <button className="group relative px-8 py-4 bg-primary text-primary-foreground text-lg font-semibold rounded-full overflow-hidden shadow-2xl transition-all hover:scale-105 hover:shadow-primary/50">
              <div className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out" />
              <span className="flex items-center gap-2">
                Book a Session <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Main Content Wrapper */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 mt-12 space-y-32">
        
        {/* Packages Section */}
        {packages && packages.length > 0 && (
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Our Experiences</h2>
              <p className="text-muted-foreground text-lg max-w-xl">Curated collections designed to perfectly capture your story.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((pkg) => (
                <motion.div 
                  key={pkg.package_id}
                  variants={itemVariants}
                  className="group relative flex flex-col bg-card border border-border rounded-3xl overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                >
                  <div className="relative h-64 w-full bg-muted overflow-hidden">
                    {pkg.cover_url ? (
                      <Image 
                        src={pkg.cover_url} 
                        alt={pkg.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                        <Camera className="text-primary/20 w-16 h-16" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold shadow-sm">
                      ${pkg.base_price}
                    </div>
                  </div>
                  
                  <div className="flex flex-col flex-1 p-8">
                    <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                    {pkg.description && (
                      <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                        {pkg.description}
                      </p>
                    )}
                    
                    <div className="mt-auto pt-6 border-t border-border">
                      <Link href={`/${slug}/book?package=${pkg.package_id}`} className="w-full inline-flex items-center justify-center py-3 bg-muted hover:bg-primary hover:text-primary-foreground font-medium rounded-xl transition-colors">
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
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Featured Work</h2>
              <p className="text-muted-foreground text-lg max-w-xl">A glimpse into the moments we've immortalized.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[250px]">
              {portfolio.slice(0, 8).map((gallery, i) => (
                <motion.a
                  key={gallery.gallery_id}
                  href={`/${slug}/gallery/${gallery.shared_link}`}
                  variants={itemVariants}
                  className={`group relative rounded-2xl overflow-hidden block ${i === 0 || i === 3 ? 'col-span-2 row-span-2' : ''}`}
                >
                  <div className="absolute inset-0 bg-muted">
                    {gallery.cover_photo_url ? (
                      <Image 
                        src={gallery.cover_photo_url} 
                        alt={gallery.title || 'Gallery'} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <Camera className="text-primary/20 w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <h4 className="text-white font-semibold text-lg">{gallery.title}</h4>
                    <p className="text-white/80 text-sm flex items-center gap-1 mt-1">View Gallery <ExternalLink size={14}/></p>
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
            className="bg-muted/50 rounded-[3rem] p-12 md:p-24 text-center"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Meet the Team</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-16">The creatives behind the lens bringing your vision to life.</p>
            
            <div className="flex flex-wrap justify-center gap-12">
              {team.map((member) => (
                <motion.div key={member.staff_id} variants={itemVariants} className="flex flex-col items-center max-w-[250px]">
                  <div className="w-40 h-40 rounded-full overflow-hidden mb-6 border-4 border-background shadow-lg relative bg-muted">
                    {member.avatar_url ? (
                      <Image src={member.avatar_url} alt={member.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary/30">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                  {member.bio && (
                    <p className="text-muted-foreground text-sm leading-relaxed">{member.bio}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Footer/Contact */}
        <footer className="border-t border-border pt-16 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            {logo_url ? (
              <img src={logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                {name?.charAt(0) || 'S'}
              </div>
            )}
            <div>
              <h4 className="font-bold text-lg">{name}</h4>
              <p className="text-muted-foreground text-sm">Capturing life's moments.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-muted-foreground">
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Mail size={18} /> {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Phone size={18} /> {phone}
              </a>
            )}
            {address && (
              <span className="flex items-center gap-2">
                <MapPin size={18} /> {address}
              </span>
            )}
          </div>
        </footer>
      </main>
    </div>
  )
}
