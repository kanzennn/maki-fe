import * as voucherRepository from '../repositories/voucher.repository'
import type { Voucher } from '../types'

export function setVoucherActive(voucherId: string, isActive: boolean): Promise<Voucher> {
  return voucherRepository.setVoucherActive(voucherId, isActive)
}
