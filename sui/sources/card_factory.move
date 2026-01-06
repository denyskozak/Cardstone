module cardstone::card_factory {
    use sui::object;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::option::{Self, Option};
    use sui::signer;

    /// Card metadata stored on-chain. Optional numeric stats can be used to
    /// express minions, weapons, or any other card type from the game code.
    struct Card has key {
        id: object::UID,
        card_id: vector<u8>,
        name: vector<u8>,
        card_type: vector<u8>,
        cost: u64,
        rarity: Option<vector<u8>>,
        set: Option<vector<u8>>,
        tribe: Option<vector<u8>>,
        text: Option<vector<u8>>,
        image_url: Option<vector<u8>>,
        attack: Option<u64>,
        health: Option<u64>,
        durability: Option<u64>,
    }

    /// Mint a new card object to the sender. The flexible optional fields
    /// mirror the data shape used by the existing game definitions.
    public entry fun mint(
        minter: &signer,
        card_id: vector<u8>,
        name: vector<u8>,
        card_type: vector<u8>,
        cost: u64,
        rarity: Option<vector<u8>>,
        set: Option<vector<u8>>,
        tribe: Option<vector<u8>>,
        text: Option<vector<u8>>,
        image_url: Option<vector<u8>>,
        attack: Option<u64>,
        health: Option<u64>,
        durability: Option<u64>,
        ctx: &mut TxContext,
    ) {
        let card = Card {
            id: object::new(ctx),
            card_id,
            name,
            card_type,
            cost,
            rarity,
            set,
            tribe,
            text,
            image_url,
            attack,
            health,
            durability,
        };

        transfer::transfer(card, signer::address_of(minter));
    }
}
