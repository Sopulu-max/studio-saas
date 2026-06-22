import { getStudioContext } from '@/lib/studio'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, PackageSearch, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Products & Frames | Weave' }

export default async function ProductsPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: productsRaw } = await context.admin
    .from('products')
    .select('*, product_variants(*)')
    .eq('studio_id', context.studioId)
    .order('created_at', { ascending: false })
  
  const products = (productsRaw || []) as any[]

  const { data: templatesRaw } = await context.admin
    .from('frame_templates')
    .select('*')
    .eq('studio_id', context.studioId)
    .order('created_at', { ascending: false })

  const templates = (templatesRaw || []) as any[]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Products & Prints</h1>
          <p className="text-sm text-muted-foreground">Manage your physical product catalog and mockup frame templates.</p>
        </div>
        <div className="flex gap-2">
          {/* Simple placeholder buttons for future modal workflows */}
          <Button variant="outline" className="gap-2">
            <ImageIcon className="w-4 h-4" /> New Frame Template
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> New Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Products List */}
        <section>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-muted-foreground" />
            Product Catalog
          </h2>
          <div className="space-y-3">
            {products.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground border-dashed">
                <p>No products added yet.</p>
                <p className="text-sm mt-1">Start by adding a canvas or framed print.</p>
              </Card>
            ) : (
              products.map(product => (
                <Card key={product.product_id} className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-base">{product.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{product.type}</p>
                    </div>
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">Base Price: NGN {Number(product.base_price).toLocaleString('en-NG')}</p>
                  
                  {product.product_variants && product.product_variants.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Variants (Sizes)</p>
                      <div className="flex flex-wrap gap-2">
                        {product.product_variants.map((variant: any) => (
                          <Badge key={variant.variant_id} variant="outline" className="text-xs font-normal">
                            {variant.size_label} (+NGN {Number(variant.price_adjustment).toLocaleString('en-NG')})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Frame Templates List */}
        <section>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
            Mockup Frame Templates
          </h2>
          <div className="space-y-3">
            {templates.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground border-dashed">
                <p>No templates uploaded.</p>
                <p className="text-sm mt-1">Upload transparent PNGs to let clients preview their photos inside physical frames.</p>
              </Card>
            ) : (
              templates.map(template => (
                <Card key={template.template_id} className="p-4 flex gap-4 items-center">
                  <div className="w-20 h-20 bg-muted rounded-md border flex items-center justify-center shrink-0 overflow-hidden relative">
                    {/* A small preview using the actual mask coordinates to show how it works */}
                    <div 
                      className="absolute inset-0 z-10" 
                      style={{ 
                        backgroundImage: `url(${template.overlay_image_url})`, 
                        backgroundSize: 'contain', 
                        backgroundPosition: 'center', 
                        backgroundRepeat: 'no-repeat' 
                      }} 
                    />
                    <div 
                      className="absolute bg-blue-500/20" 
                      style={
                        // Parse mask_css into react styles. Example: 'top: 10%; left: 15%; width: 70%; height: 80%;'
                        template.mask_css?.split(';').filter(Boolean).reduce((acc: any, rule: string) => {
                          const [key, val] = rule.split(':').map(s => s.trim())
                          if (key && val) acc[key] = val
                          return acc
                        }, {}) || { inset: '10%' }
                      }
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-base">{template.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1 bg-muted p-1 rounded inline-block">
                      {template.mask_css}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
