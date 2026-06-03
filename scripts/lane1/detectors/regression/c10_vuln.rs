pub fn collect_fee(ctx: Context<CollectFee>, amount: u64) -> Result<()> {
    **ctx.accounts.fee_pda.to_account_info().try_borrow_mut_lamports()? += amount; // lamports IN to PDA
    Ok(()) // ...and NO withdraw instruction anywhere = stuck-SOL-in-PDA (C10)
}
