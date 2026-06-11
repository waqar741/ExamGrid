'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getPayRates() {
  const { data, error } = await supabase
    .from('branch_pay_rates')
    .select(`
      *,
      branches (name)
    `)
    .order('effective_from', { ascending: false });

  if (error) {
    console.error('Error fetching pay rates:', error);
    return [];
  }
  return data;
}

export async function createPayRate(formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const branchId = formData.get('branch_id') as string;
  const shiftType = formData.get('shift_type') as string;
  const rateStr = formData.get('rate') as string;
  const effectiveFrom = formData.get('effective_from') as string;
  const effectiveTo = formData.get('effective_to') as string;

  if (!branchId || !shiftType || !rateStr || !effectiveFrom) {
    return { error: 'Branch, Shift Type, Rate, and Effective From are required' };
  }

  if (!['MORNING', 'AFTERNOON', 'FULL_DAY'].includes(shiftType)) {
    return { error: 'Invalid shift type' };
  }

  const rate = parseFloat(rateStr);

  // Validation: Check for overlapping active rates
  // An overlap occurs if another rate exists for the same branch and shift where:
  // (existing.effective_from <= new.effective_to OR new.effective_to is null) AND
  // (existing.effective_to >= new.effective_from OR existing.effective_to is null)
  
  let query = supabase
    .from('branch_pay_rates')
    .select('id')
    .eq('branch_id', branchId)
    .eq('shift_type', shiftType);
    
  if (effectiveTo) {
    // If the new rate has an end date, we check if existing rates start before the new one ends
    // AND they end after the new one starts
    query = query.or(`effective_to.gte.${effectiveFrom},effective_to.is.null`)
                 .lte('effective_from', effectiveTo);
  } else {
    // If new rate has no end date, it overlaps if any existing rate ends after it starts (or doesn't end)
    query = query.or(`effective_to.gte.${effectiveFrom},effective_to.is.null`);
  }

  const { data: overlapping } = await query.limit(1);
  if (overlapping && overlapping.length > 0) {
    return { error: 'Overlapping active rate found for this branch and shift type combination. Please close the existing rate first.' };
  }

  // Insert rate
  const { data: newRate, error } = await supabase
    .from('branch_pay_rates')
    .insert([{
      branch_id: branchId,
      shift_type: shiftType,
      rate,
      effective_from: effectiveFrom,
      effective_to: effectiveTo || null,
      created_by: session.userId
    }])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating pay rate:', error);
    return { error: 'Failed to create pay rate: ' + error.message };
  }

  // Audit log
  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'branch_pay_rates',
    entity_id: newRate.id,
    action: 'CREATE',
    new_values: { branch_id: branchId, shift_type: shiftType, rate, effective_from: effectiveFrom, effective_to: effectiveTo || null }
  }]);

  revalidatePath('/dashboard/pay-rates');
  return { success: true };
}

export async function updatePayRate(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: currentRate } = await supabase.from('branch_pay_rates').select('*').eq('id', id).single();
  if (!currentRate) return { error: 'Rate not found' };

  const rateStr = formData.get('rate') as string;
  const effectiveFrom = formData.get('effective_from') as string;
  const effectiveTo = formData.get('effective_to') as string;

  if (!rateStr || !effectiveFrom) {
    return { error: 'Rate and Effective From are required' };
  }

  const newRateAmount = parseFloat(rateStr);

  const todayStr = new Date().toISOString().split('T')[0];
  const isActive = currentRate.effective_from <= todayStr;

  let updatePayload: any = { effective_to: effectiveTo || null };

  if (!isActive) {
    // If rate hasn't started yet, we can modify everything
    updatePayload.rate = newRateAmount;
    updatePayload.effective_from = effectiveFrom;
  } else {
    // If active, we can only modify effective_to
    if (newRateAmount !== currentRate.rate || effectiveFrom !== currentRate.effective_from) {
       // Just silently ignore changes to rate/effective_from or return error. Let's return error to be safe.
       // Actually, the UI should disable these, but if they changed, we block.
       if (newRateAmount !== currentRate.rate) return { error: 'Cannot modify amount of an already active rate. Please end it and create a new one.' };
       if (effectiveFrom !== currentRate.effective_from) return { error: 'Cannot modify start date of an already active rate.' };
    }
  }

  // Check overlap for updates (excluding self)
  let query = supabase
    .from('branch_pay_rates')
    .select('id')
    .eq('branch_id', currentRate.branch_id)
    .eq('shift_type', currentRate.shift_type)
    .neq('id', id);

  const checkFrom = updatePayload.effective_from || currentRate.effective_from;
  const checkTo = updatePayload.effective_to;

  if (checkTo) {
    query = query.or(`effective_to.gte.${checkFrom},effective_to.is.null`)
                 .lte('effective_from', checkTo);
  } else {
    query = query.or(`effective_to.gte.${checkFrom},effective_to.is.null`);
  }

  const { data: overlapping } = await query.limit(1);
  if (overlapping && overlapping.length > 0) {
    return { error: 'Overlapping active rate found for this branch and shift combination.' };
  }

  const { error } = await supabase
    .from('branch_pay_rates')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    return { error: 'Failed to update rate' };
  }

  // Audit log
  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'branch_pay_rates',
    entity_id: id,
    action: 'UPDATE',
    old_values: currentRate,
    new_values: { ...currentRate, ...updatePayload }
  }]);

  revalidatePath('/dashboard/pay-rates');
  return { success: true };
}

export async function archivePayRate(id: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: currentRate } = await supabase.from('branch_pay_rates').select('*').eq('id', id).single();
  if (!currentRate) return { error: 'Rate not found' };

  // To archive an active rate, we set effective_to = yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const effectiveTo = yesterday.toISOString().split('T')[0];

  const updatePayload = { effective_to: effectiveTo };

  const { error } = await supabase
    .from('branch_pay_rates')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    return { error: 'Failed to archive rate' };
  }

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'branch_pay_rates',
    entity_id: id,
    action: 'ARCHIVE',
    old_values: currentRate,
    new_values: { ...currentRate, ...updatePayload }
  }]);

  revalidatePath('/dashboard/pay-rates');
  return { success: true };
}
