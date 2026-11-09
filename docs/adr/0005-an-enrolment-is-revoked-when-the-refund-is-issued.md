# An Enrolment is revoked when the Refund is Issued, not when the Refund Request is approved

Supersedes ADR 0002. A Learner keeps their Enrolment until the money is confirmed as sent back to them. We don't want a buyer to be left with neither the course nor their money while the Refund is Pending or has Failed. A Team Licence is different: its Unclaimed Seats are locked as soon as the Refund Request is approved, because no Learner is watching through an Unclaimed Seat, and the Team Admin shouldn't have team members claiming Seats on a Licence they are giving up.

## Considered Options

- **At approval (ADR 0002)**: rejected, because the buyer would lose the course before getting their money, and indefinitely if the Refund fails.
- **When the Refund is Issued, for Team Licences too**: rejected, because Seats could still be claimed after the Team Admin's Refund Request was approved, which would go against what the Team Admin expects.

## Consequences

A Learner whose Refund has Failed keeps watching the course until the money is sent. ADR 0002 turned down Issued for this reason; we now accept it, because withholding both the course and the money is the worse outcome.
