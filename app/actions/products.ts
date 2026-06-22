'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  type: z.enum(['frame', 'print', 'canvas', 'album']),
  base_price: z.number().min(0, 'Base price cannot be negative'),
  description: z.string().optional().default(''),
  is_active: z.boolean().default(true),
})

const variantSchema = z.object({
  size_label: z.string().min(1, 'Size label is required'),
  price_adjustment: z.number().default(0),
})

export async function createProduct(form: z.infer<typeof productSchema>) {
  const result = productSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { data, error } = await context.admin
    .from('products')
    .insert({
      studio_id: context.studioId,
      ...result.data,
    })
    .select('product_id')
    .single()

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/products')
  return { error: null, productId: data.product_id }
}

export async function addProductVariant(productId: string, form: z.infer<typeof variantSchema>) {
  const result = variantSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // Verify product belongs to studio
  const { data: product } = await context.admin
    .from('products')
    .select('product_id')
    .eq('product_id', productId)
    .eq('studio_id', context.studioId)
    .single()

  if (!product) return { error: 'Product not found' }

  const { error } = await context.admin
    .from('product_variants')
    .insert({
      product_id: productId,
      ...result.data,
    })

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/products')
  return { error: null }
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { error } = await context.admin
    .from('products')
    .update({ is_active: isActive })
    .eq('product_id', productId)
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/products')
  return { error: null }
}

const frameTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  overlay_image_url: z.string().url('Must be a valid URL'),
  mask_css: z.string().optional().default('top: 10%; left: 10%; width: 80%; height: 80%;'),
})

export async function createFrameTemplate(form: z.infer<typeof frameTemplateSchema>) {
  const result = frameTemplateSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { error } = await context.admin
    .from('frame_templates')
    .insert({
      studio_id: context.studioId,
      ...result.data,
    })

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/products')
  return { error: null }
}

export async function deleteFrameTemplate(templateId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { error } = await context.admin
    .from('frame_templates')
    .delete()
    .eq('template_id', templateId)
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/products')
  return { error: null }
}
