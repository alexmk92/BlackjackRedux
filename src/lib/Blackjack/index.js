import Deck from './Deck'
import Hand from './Hand'
import { Map } from 'immutable' // Any data returned is Immutable, Blackjack class can only mutate state
import * as status from './status'
import * as players from './players'
import _ from 'lodash'

// I would normally use the ES6 syntax with class, but I wanted to demonstrate
// that I understand how to chain module definitions using "prototype"
// Also note that I have not implemented the concept of betting in this program
// but that could easily be added to the rule set :)
// For the sake of simplicity I have not used Immutable.js,
function Blackjack(numberOfDecks = 1, timesToShuffle = 1, maxPlayers = 1)
{
    this.deck = new Deck(numberOfDecks, timesToShuffle)
    this.numberOfDecks = numberOfDecks
    this.timesToShuffle = timesToShuffle
    this.maxPlayers = maxPlayers
    this.players = [],
    this.winners = [],
    this.dealer = { id: players.DEALER, hand: new Hand(), wins: 0 }
    //this.player = new Hand()
    this.turn = null
}

// This is bad practice as it ends up being a public API function which means
// anybody with access to the instance can force a new ga,e, for the sake
// of a quick hack I've just included it on the Blackjack prototype, to avoid
// this I could A) scope it to the file but it wouldnt be attached to the 
// Blackjack instance so I'd have to pass params directly   B) Wrap this code
// in an IIFE block and have it as a private defintion
Blackjack.prototype.NewGame = function()
{
    this.dealer.hand = new Hand()
    this.players.forEach((player) => {
        player.hand = new Hand()
        player.beatHouse = false
    })

    this.turn = this.dealer

    this.deck = new Deck(this.numberOfDecks, this.timesToShuffle)

    // draw for the dealer
    this.Hit()

    // now set the players turn 
    this.players.forEach((player) => {
        this.turn = player
        
        // draw players two initial cards
        this.Hit()
        this.Hit()
    })

    this.turn = this.players[0]

    // Possibility of starting blackjack
    return this.CheckForWinner()
}

Blackjack.prototype.GameState = function() {
    return Map({
        deck: this.deck, 
        players: this.players,
        dealer: this.dealer,
        winners: this.winners,
        numberOfDecks: this.numberOfDecks,
        timesToShuffle: this.timesToShuffle,
        turn: this.turn,
    }) 
}

Blackjack.prototype.SpawnPlayer = function() {
    var playerId = null 

    if(this.players.length < this.maxPlayers) {

        playerId = players.NEW_PLAYER()

        this.players.push({ 
            id: playerId, 
            wins: 0, 
            hand: new Hand(), 
            beatHouse: false, 
            status: status.VALID 
        })
        
    }

    return playerId
}

Blackjack.prototype.RemovePlayer = function(playerId) {
    if(this.players.length > 0 && playerId) {
        this.players.splice(this.players.indexOf(playerId), 1)
    }
}

Blackjack.prototype.GetHighestHand = function() {
    let scoreToBeat = 0

    this.players.forEach((player) => {
        let score = player.hand.GetScore()
        if(score > scoreToBeat) {
            scoreToBeat = score
        }
    })
}

Blackjack.prototype.Stick = function()
{
    this.turn.hand.status = status.STICK

    let nextPlayer = this.GetNextPlayer()

    if(!nextPlayer) {
         this.turn = this.dealer
         
         var highestScore = this.GetHighestHand()
         
        // Dealer now has to play until he beats or matches player score
        while(this.dealer.hand.GetScore() <= highestScore)
        {
            this.Hit()
        } 

        this.CheckForWinner()
        
    } else {
        this.turn = nextPlayer
    }
   
    return this.GameState()
}

Blackjack.prototype.Fold = function()
{
    this.player.status = status.FOLD;
    
    let nextPlayer = this.GetNextPlayer()

    if(!nextPlayer) {
        this.CheckForWinner()
    } else {
        this.turn = nextPlayer
    }

    return this.GameState()
}

Blackjack.prototype.GetNextPlayer = function() {
    let currentPlayer = this.turn 
    let nextPlayer = null

    this.players.some(function(player, i) {
        if(player.id === currentPlayer.id) {
            if(this.players.length < i) {
                nextPlayer = this.players[i+1]
                return true
            }
        }

        return false
    })

    return nextPlayer
}

Blackjack.prototype.CheckForWinner = function()
{
    const DEALER_SCORE = this.dealer.hand.GetScore()

    this.players.forEach((player) => {
        const PLAYER_SCORE = player.hand.GetScore()

        if(this.turn !== players.DEALER && PLAYER_SCORE > 21) // went bust on player turn is instant loss
        {
            this.RemovePlayerWinCondition(player)
        }
        else if(player.hand.IsBlackjack()) // check player blackjack
        {
            this.AddPlayerWindCondition(player)
        }
        else if(dealer.hand.IsBlackjack()) // check dealer blackjack
        {
            this.RemovePlayerWinCondition(player)
        }
        else if(PLAYER_SCORE > 0 && DEALER_SCORE > 0) // check when both people have played
        {
            if(this.turn.id === player.id)
            {
                if(player.status !== status.VALID || PLAYER_SCORE > 21)
                    this.RemovePlayerWinCondition(player)
            }
            else if(this.turn.id === this.dealer.id)
            {
                if(this.dealer.status !== status.VALID || DEALER_SCORE > 21)
                    this.RemovePlayerWinCondition(player)
            }
        }
        // When its the dealers turn, all draws have been made - make a final win condition check
        if(this.turn === players.DEALER && PLAYER_SCORE > 0 && DEALER_SCORE > 0) 
        {
            PLAYER_SCORE >= DEALER_SCORE
                    ? this.AddPlayerWindCondition(player)
                    : this.RemovePlayerWinCondition(player)
        } 
    })
}

Blackjack.prototype.RemovePlayerWinCondition = function(player) {

    if(this.winners.length > 0) {
        this.winners.splice(this.winners.indexOf(player.id), 1)
    }

}

Blackjack.prototype.AddPlayerWindCondition = function(player) {
    let found = false
    this.winners.some((winner) => {
        found = winner.id === player.id
    })

    if(!found) {
        this.winners.push(player.id)
    }
}

// Currently only supports single player / dealer support - could solve this using
// player ids in the JS object.
Blackjack.prototype.Hit = function()
{
    if(this.deck.cards.length > 0) {
        let card = this.deck.Draw()

        this.turn.hand.AddCardToHand(card)
    }

    // if we hit 21 then the dealer needs to play
    if(this.turn.hand.GetScore() === 21)
    {
        return this.Stick()
    }
    else 
    {
        return this.CheckForWinner()
    }
}

module.exports = Blackjack