#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
}
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    require!(ctx.accounts.authority.key() == ctx.accounts.vault.owner, ErrorCode::Unauthorized);
    // body-only check — DC-8 refactor-regression risk
    Ok(())
}
