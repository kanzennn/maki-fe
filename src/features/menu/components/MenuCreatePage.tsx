import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'

import { allCategoriesQuery, useCreateMenu } from '../api'
import { MenuForm } from './MenuForm'

/** A new menu, in one of the outlet's categories: without any, it says to create one first. */
export function MenuCreatePage() {
  const { t } = useTranslation('menu')
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid/menus/new' })
  const navigate = useNavigate()
  const { data: categories } = useSuspenseQuery(allCategoriesQuery(oid))
  const create = useCreateMenu(oid)

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/menus" params={{ oid }}>
            {t('detail.back')}
          </BackLink>
        }
        title={t('create.title')}
      />
      {categories.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-card border border-outline p-6">
          <p className="text-on-surface-variant">{t('create.needCategory')}</p>
          <Button asChild className="h-11">
            <Link to="/admin/outlets/$oid/menus/categories" params={{ oid }}>
              {t('create.toCategories')}
            </Link>
          </Button>
        </div>
      ) : (
        <MenuForm
          categories={categories}
          submitLabel={t('create.submit')}
          onSubmit={async (input) => {
            await create.mutateAsync(input)
            await navigate({ to: '/admin/outlets/$oid/menus', params: { oid } })
          }}
        />
      )}
    </div>
  )
}
