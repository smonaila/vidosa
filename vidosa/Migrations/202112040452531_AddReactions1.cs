namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddReactions1 : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Reactions", "UserId", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.Reactions", "UserId");
        }
    }
}
