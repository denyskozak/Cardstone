module metacards::metacards_coin {
    use sui::coin::{Self, TreasuryCap};
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::signer;
    use sui::option;

    /// Phantom type that represents the Metacards coin.
    struct MetacardsCoin has drop {}

    /// One-time initializer to create the currency and move the
    /// capabilities to the transaction sender.
    public entry fun init(admin: &signer, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency<MetacardsCoin>(
            admin,
            9,
            b"Metacards Coin",
            b"CSTONE",
            b"Utility coin for the Metacards project",
            option::none(),
            ctx,
        );

        // Keep ownership of both objects with the initializer account.
        transfer::public_transfer(metadata, signer::address_of(admin));
        transfer::public_transfer(treasury, signer::address_of(admin));
    }

    /// Mint new Metacards coins into the caller's account. Requires the
    /// `TreasuryCap` that was produced by `init`.
    public entry fun mint(admin: &signer, treasury: &mut TreasuryCap<MetacardsCoin>, amount: u64, ctx: &mut TxContext) {
        let minted = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(minted, signer::address_of(admin));
    }

    /// Burn a coin supply, reducing total circulation.
    public entry fun burn(_admin: &signer, treasury: &mut TreasuryCap<MetacardsCoin>, coin: coin::Coin<MetacardsCoin>) {
        coin::burn(treasury, coin);
    }
}
